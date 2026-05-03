import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createColumnHelper, useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, flexRender, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { FaUsersViewfinder } from "react-icons/fa6";
import { MdSaveAlt, MdClose } from "react-icons/md";

interface Customer {
    id: number;
    cluster: string;
    meter_number: string;
    customer_name: string; 
}

interface ClusterCustomer {
    id: string;
    customer_id: number;
    customer_name: string;
    meter_number: string;
    previous_reading: number;
    current_reading: string | number;
    usage: number;
    discount: string;
    penalty: string;
    arrears: number;
    grossAmount: number;
    netAmount: number;
    totalDue: number;
    isCalculated: boolean;
    cluster: string;
}

interface GenerateBillModalProps {
    isOpen: boolean;
    onClose: () => void;
    customers: Customer[];
    clusters: string[];
    onSave: () => void;
}

const GenerateBillModal: React.FC<GenerateBillModalProps> = ({
    isOpen,
    onClose,
    customers,
    clusters,
    onSave,
}) => {
    const [selectedCluster, setSelectedCluster] = useState('');
    const [clusterCustomers, setClusterCustomers] = useState<ClusterCustomer[]>([]);
    const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
    const [selectAll, setSelectAll] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    
    // Date controls - initialize with today's date
    const today = new Date().toISOString().split('T')[0];
    const [billingDate, setBillingDate] = useState(today);
    const [dueDate, setDueDate] = useState(today);
    const [billingPeriod, setBillingPeriod] = useState('Monthly');
    
    // Table state
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const inputRefs = useRef<Record<string, HTMLInputElement>>({});

    const handleClusterSelect = async (clusterLetter: string) => {
    setSelectedCluster(clusterLetter);
    setClusterCustomers([]);
    setSelectedRows({});
    setSelectAll(false);

    if (!clusterLetter) return;

    const filtered = customers.filter(c => c.cluster.charAt(0) === clusterLetter);
    console.log(' Selected cluster:', clusterLetter);
    console.log(' Filtered customers:', filtered);
    
    const entries = await Promise.all(
        filtered.map(async (customer) => {
            try {
                // STEP 1: Check if we're calling the API
                console.log(` Calling getLastReading for customer ${customer.id} (${customer.customer_name})`);
                
                const lastReading = await window.electronAPI.bills.getLastReading(customer.id);
                console.log(` getLastReading returned:`, lastReading, `(type: ${typeof lastReading})`);
                
                const arrears = await window.electronAPI.bills.getArrears(customer.id);
                console.log(` getArrears returned:`, arrears);
                
                return {
                    id: customer.id.toString(),
                    customer_id: customer.id,
                    customer_name: customer.customer_name,
                    meter_number: customer.meter_number,
                    previous_reading: lastReading,
                    current_reading: '',
                    usage: 0,
                    discount: '0',
                    penalty: '0',
                    arrears: arrears,
                    grossAmount: 0,
                    netAmount: 0,
                    totalDue: 0,
                    isCalculated: false,
                    cluster: customer.cluster,
                };
            } catch (error) {
                console.error(` Error loading data for customer ${customer.id}:`, error);
                return null;
            }
        })
    );
    
    console.log(' Final cluster customers:', entries);
    setClusterCustomers(entries.filter(Boolean));
};

    const calculateBillForRow = useCallback(async (
        rowId: string, 
        currentReading?: string, 
        discount?: string, 
        penalty?: string
    ) => {
        // Get the latest row data from state
        let row: ClusterCustomer | undefined;
        
        // Use functional update to read state without modifying it
        setClusterCustomers(prev => {
            row = prev.find(c => c.id === rowId);
            return prev; // Don't modify state here, just read it
        });
        
        // Wait for state to be read (React batches state updates)
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // If parameters are provided, use them; otherwise use the row values
        const finalCurrentReading = currentReading || row?.current_reading?.toString() || '0';
        const finalDiscount = discount || row?.discount?.toString() || '0';
        const finalPenalty = penalty || row?.penalty?.toString() || '0';
        const finalArrears = row?.arrears || 0;
        const finalPrevReading = row?.previous_reading || 0;
        
        if (!finalCurrentReading || parseFloat(finalCurrentReading) <= finalPrevReading) {
            setMessage({ type: 'error', text: 'Current reading must be greater than previous reading' });
            return;
        }

        try {
            const result = await window.electronAPI.bills.calculate(
                finalPrevReading,
                parseFloat(finalCurrentReading),
                parseFloat(finalDiscount) || 0,
                parseFloat(finalPenalty) || 0
            );

            const totalDue = result.totalDue + finalArrears;

            setClusterCustomers(prev =>
                prev.map(customer =>
                    customer.id === rowId
                        ? {
                            ...customer,
                            usage: result.usage,
                            grossAmount: result.grossAmount,
                            netAmount: result.netAmount,
                            totalDue: totalDue,
                            isCalculated: true,
                        }
                        : customer
                )
            );
        } catch (error) {
            console.error('Error calculating bill:', error);
            setMessage({ type: 'error', text: 'Failed to calculate bill' });
        }
    }, []); // Empty dependency array

    // Auto-recalculate when any row has isCalculated: false and valid readings
    useEffect(() => {
        const calculatePendingRows = async () => {
            for (const customer of clusterCustomers) {
                if (!customer.isCalculated) {
                    const prevReading = customer.previous_reading || 0;
                    const currentReading = parseFloat(customer.current_reading?.toString() || '0');
                    const discount = parseFloat(customer.discount?.toString() || '0');
                    const penalty = parseFloat(customer.penalty?.toString() || '0');
                    const arrears = customer.arrears || 0;

                    // If current reading is empty or invalid, reset totals to zero
                    if (!customer.current_reading || currentReading <= prevReading) {
                        if (customer.usage !== 0 || customer.grossAmount !== 0) {
                            setClusterCustomers(prev =>
                                prev.map(c =>
                                    c.id === customer.id
                                        ? { ...c, usage: 0, grossAmount: 0, netAmount: 0, totalDue: 0 }
                                        : c
                                )
                            );
                        }
                        continue;
                    }

                    // Calculate with latest values
                    try {
                        const result = await window.electronAPI.bills.calculate(
                            prevReading,
                            currentReading,
                            discount,
                            penalty
                        );

                        const totalDue = result.totalDue + arrears;

                        setClusterCustomers(prev =>
                            prev.map(c =>
                                c.id === customer.id
                                    ? {
                                        ...c,
                                        usage: result.usage,
                                        grossAmount: result.grossAmount,
                                        netAmount: result.netAmount,
                                        totalDue: totalDue,
                                        isCalculated: true,
                                    }
                                    : c
                            )
                        );
                    } catch (error) {
                        console.error('Error auto-calculating bill:', error);
                    }
                }
            }
        };

        // Debounce the calculation to avoid rapid re-calculations while typing
        const timeoutId = setTimeout(calculatePendingRows, 300);
        return () => clearTimeout(timeoutId);
    }, [clusterCustomers]);

    const saveAllBills = async () => {
        const billsToSave = clusterCustomers.filter(c => c.isCalculated);

        if (billsToSave.length === 0) {
            setMessage({ type: 'error', text: 'No calculated bills to save' });
            return;
        }

        // Validate dates
        if (!billingDate) {
            setMessage({ type: 'error', text: 'Please select a billing date' });
            return;
        }
        if (!dueDate) {
            setMessage({ type: 'error', text: 'Please select a due date' });
            return;
        }

        setLoading(true);
        
        let successCount = 0;
        let errorCount = 0;

        for (const bill of billsToSave) {
            try {
                const result = await window.electronAPI.bills.create({
                    customer_id: bill.customer_id,
                    previous_reading: bill.previous_reading,
                    current_reading: parseFloat(bill.current_reading.toString()),
                    discount: parseFloat(bill.discount) || 0,
                    penalty: parseFloat(bill.penalty) || 0,
                    billing_date: billingDate,
                    billing_period: billingPeriod,
                    due_date: dueDate,
                });

                if (result.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                errorCount++;
                console.error('Error saving bill:', error);
            }
        }

        setMessage({
            type: successCount > 0 ? 'success' : 'error',
            text: `Saved ${successCount} bill(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        });

        if (successCount > 0) {
            onSave();
            setTimeout(() => {
                onClose();
            }, 1500);
        }

        setLoading(false);
    };

    const formatCurrency = (amount: number) => `₱ ${amount.toFixed(2)}`;

    const handleSelectAll = (checked: boolean) => {
        setSelectAll(checked);
        const newSelected: Record<string, boolean> = {};
        clusterCustomers.forEach(customer => {
            newSelected[customer.id] = checked;
        });
        setSelectedRows(newSelected);
    };

    const handleRowSelect = (rowId: string, checked: boolean) => {
        setSelectedRows(prev => {
            const newSelected = { ...prev, [rowId]: checked };
            const allSelected = clusterCustomers.every(c => newSelected[c.id]);
            setSelectAll(allSelected);
            return newSelected;
        });
    };

    const columnHelper = createColumnHelper<ClusterCustomer>();
    
    // FIX: Empty dependency array to prevent recreating columns on every render
    const columns = useMemo(() => [
        columnHelper.accessor('cluster', {
            header: 'Cluster',
            size: 80,  // Fixed width
            minSize: 60,
        }),
        columnHelper.accessor('customer_name', {
            header: 'Customer Name',
            size: 180,
            minSize: 120,
        }),
        columnHelper.accessor('meter_number', { 
            header: 'Meter Number',
            size: 180,
            minSize: 100,
        }),
        columnHelper.accessor('previous_reading', { 
            header: 'Previous Reading',
            size: 100,
            minSize: 110,
            cell: info => {
                const rowId = info.row.original.id;
                const value = info.getValue();
                
                return (
                    <input
                        type="number"
                        className="table-input"
                        value={value || ''}
                        onChange={(e) => {
                            const newValue = parseFloat(e.target.value) || 0;
                            
                            setClusterCustomers(prev =>
                                prev.map(customer =>
                                    customer.id === rowId
                                        ? { ...customer, previous_reading: newValue, isCalculated: false }
                                        : customer
                                )
                            );
                        }}
                        placeholder="0"
                        onClick={(e) => e.stopPropagation()}
                        style={value === 0 ? { background: '#ffffff', borderColor: '#ffffff' } : {}}
                        title={value === 0 ? "No previous reading found. You can enter it manually." : "Auto-fetched from last bill. You can edit if needed."}
                    />
                );
            },
        }),
        columnHelper.accessor('current_reading', {
            header: 'Current Reading',
            size: 140,
            minSize: 110,
            cell: info => {
                const rowId = info.row.original.id;
                const prevReading = info.row.original.previous_reading;
                
                return (
                    <input
                        type="number"
                        className="table-input"
                        value={info.getValue() || ''}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            
                            setClusterCustomers(prev =>
                                prev.map(customer =>
                                    customer.id === rowId
                                        ? { ...customer, current_reading: newValue, isCalculated: false }
                                        : customer
                                )
                            );
                        }}
                        placeholder="0"
                        onClick={(e) => e.stopPropagation()}
                    />
                );
            },
        }),
        columnHelper.accessor('discount', {
            header: 'Discount (cu.m)',
            size: 140,
            minSize: 110,
            cell: info => {
                const rowId = info.row.original.id;
                
                return (
                    <input
                        type="number"
                        className="table-input"
                        value={info.getValue() || ''}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            
                            setClusterCustomers(prev =>
                                prev.map(customer =>
                                    customer.id === rowId
                                        ? { ...customer, discount: newValue, isCalculated: false }
                                        : customer
                                )
                            );
                        }}
                        placeholder="0"
                        onClick={(e) => e.stopPropagation()}
                    />
                );
            },
        }),
        columnHelper.accessor('penalty', {
            header: 'Penalty (₱)',
            size: 120,
            minSize: 90,
            cell: info => {
                const rowId = info.row.original.id;
                
                return (
                    <input
                        type="number"
                        className="table-input"
                        value={info.getValue() || ''}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            
                            setClusterCustomers(prev =>
                                prev.map(customer =>
                                    customer.id === rowId
                                        ? { ...customer, penalty: newValue, isCalculated: false }
                                        : customer
                                )
                            );
                        }}
                        placeholder="0"
                        onClick={(e) => e.stopPropagation()}
                    />
                );
            },
        }),
        columnHelper.accessor('arrears', {
            header: 'Arrears',
            size: 100,
            minSize: 80,
            cell: info => formatCurrency(info.getValue()),
        }),
        columnHelper.accessor('totalDue', {
            header: 'Total Due',
            size: 120,
            minSize: 100,
            cell: info => {
                const value = info.getValue();
                return value > 0 ? (
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{formatCurrency(value)}</span>
                ) : (
                    <span style={{ color: '#9ca3af' }}>—</span>
                );
            },
        }),
    ], []);

    // Update the table configuration to use column sizing
    const table = useReactTable({
        data: clusterCustomers,
        columns,
        state: { sorting, columnFilters, globalFilter },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        enableColumnResizing: true,  // Enable column resizing
        columnResizeMode: 'onChange',  // Resize as user drags
    });

    if (!isOpen) return null;

    return (
        // FIX: Better overlay click handling
        <div 
            className="modal-overlay" 
            onClick={(e) => {
                // Only close if clicking the overlay itself
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="modal-container modal-container-wide" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header with Title and Close Button */}
                <div className="modal-header">
                    <div className="modal-header-left">
                        <h2 className="modal-title">Generate Bills</h2>
                    </div>
                    <button 
                        className="modal-close-btn" 
                        onClick={onClose}
                        title="Close"
                    >
                        <MdClose />
                    </button>
                </div>
                
                <div className="modal-body">
                    {/* Date and Cluster Selection Row */}
                    <div className="modal-controls-row">
                        <div className="modal-control-group">
                            <label className="modal-label">Billing Date</label>
                            <input
                                type="date"
                                className="modal-date-input"
                                value={billingDate}
                                onChange={(e) => setBillingDate(e.target.value)}
                            />
                        </div>
                        <div className="modal-control-group">
                            <label className="modal-label">Due Date</label>
                            <input
                                type="date"
                                className="modal-date-input"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                        <div className="modal-control-group">
                            <label className="modal-label">Billing Period</label>
                            <select
                                className="modal-select"
                                value={billingPeriod}
                                onChange={(e) => setBillingPeriod(e.target.value)}
                            >
                                <option value="Monthly">Monthly</option>
                                <option value="Quarterly">Quarterly</option>
                                <option value="Bi-Annual">Bi-Annual</option>
                                <option value="Annual">Annual</option>
                            </select>
                        </div>
                        <div className="modal-control-group modal-control-group-cluster">
                            <label className="modal-label">Select Cluster</label>
                            <select 
                                className="modal-select"
                                onChange={(e) => handleClusterSelect(e.target.value)}
                                value={selectedCluster}
                            >
                                <option value="">Choose a Cluster</option>
                                {clusters.map((cluster, index) => (
                                    <option key={index} value={cluster}>
                                        Cluster {cluster}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Table - Only shows when cluster is selected */}
                    {selectedCluster && clusterCustomers.length > 0 && (
                        <>

                            <div className="table-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                <div className="table-toolbar">
                                    <input
                                        type="text"
                                        placeholder="Search customers..."
                                        value={globalFilter}
                                        onChange={(e) => setGlobalFilter(e.target.value)}
                                        className="search-input"
                                    />
                                </div>
                                <div className="table-scroll" style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                                    <table className="data-table">
                                        <thead>
                                            {table.getHeaderGroups().map(headerGroup => (
                                                <tr key={headerGroup.id}>
                                                    {headerGroup.headers.map(header => (
                                                        <th key={header.id}>
                                                            {header.isPlaceholder
                                                                ? null
                                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                                        </th>
                                                    ))}
                                                </tr>
                                            ))}
                                        </thead>
                                        <tbody>
                                            {table.getRowModel().rows.map(row => (
                                                <tr key={row.id}>
                                                    {row.getVisibleCells().map(cell => (
                                                        <td key={cell.id}>
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div className="pagination-container">
                                    <div className="pagination-info">
                                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                                    </div>
                                    <div className="pagination-buttons">
                                        <button
                                            className="pagination-btn"
                                            onClick={() => table.setPageIndex(0)}
                                            disabled={!table.getCanPreviousPage()}
                                        >
                                            ««
                                        </button>
                                        <button
                                            className="pagination-btn"
                                            onClick={() => table.previousPage()}
                                            disabled={!table.getCanPreviousPage()}
                                        >
                                            «
                                        </button>
                                        <button
                                            className="pagination-btn"
                                            onClick={() => table.nextPage()}
                                            disabled={!table.getCanNextPage()}
                                        >
                                            »
                                        </button>
                                        <button
                                            className="pagination-btn"
                                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                            disabled={!table.getCanNextPage()}
                                        >
                                            »»
                                        </button>
                                    </div>
                                </div>               

                            </div>
                                <div className="modal-actions-buttons">
                                    <button
                                        className="btn-save-bulk"
                                        onClick={saveAllBills}
                                        disabled={loading}
                                    >
                                        <MdSaveAlt />{loading ? 'Saving...' : 'Save All Bills'}
                                    </button>
                                </div>
                        </>
                    )}

                    {/* Empty state when no cluster selected or no customers */}
                    {!selectedCluster && (
                        <div className="empty-state">
                            <span className="empty-icon"><FaUsersViewfinder /></span>
                            <p>Select a cluster to view customers</p>
                        </div>
                    )}

                    {selectedCluster && clusterCustomers.length === 0 && (
                        <div className="empty-state">
                            <span className="empty-icon"><FaUsersViewfinder /></span>
                            <p>No customers found in Cluster {selectedCluster}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GenerateBillModal;