import React, { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  createColumnHelper,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import './billing.css';

interface Customer {
    id: number;
    cluster: string;
    meter_number: string;
    customer_name: string;
}

interface BillCalculation {
    usage: number;
    grossAmount: number;
    netAmount: number;
    totalDue: number;
}

interface Bill {
    id: number;
    invoice_number: string;
    customer_id: number;
    previous_reading: number;
    current_reading: number;
    usage_cubic_meter: number;
    total_amount_due: number;
    amount_paid: number;
    billing_date: string;
    due_date: string;
    status: string;
}

const Billing: React.FC = () => {
    // Main states
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [allBills, setAllBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'entry' | 'history'>('entry');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [selectedCluster, setSelectedCluster] = useState('');
    const [clusterCustomers, setClusterCustomers] = useState<any[]>([]);
    const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
    const [selectAll, setSelectAll] = useState(false);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');

    useEffect(() => {
        loadCustomers();
        loadRecentBills();
    }, []);

    const loadCustomers = async () => {
        const data = await window.electronAPI.customers.getAll();
        setCustomers(data);
    };

    const loadRecentBills = async () => {
        const data = await window.electronAPI.bills.getRecent(50);
        setAllBills(data);
    };

    // Get unique cluster letters (A, B, C, D, E only)
    const clusters = useMemo(() => {
        const uniqueClusters = [...new Set(customers.map(c => {
            // Extract only the first letter of the cluster
            return c.cluster.charAt(0);
        }))];
        return uniqueClusters.sort();
    }, [customers]);

    // Open modal
    const handleOpenModal = () => {
        setShowModal(true);
        setSelectedCluster('');
        setClusterCustomers([]);
        setSelectedRows({});
        setSelectAll(false);
    };

    // Close modal
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedCluster('');
        setClusterCustomers([]);
    };

    // Load customers for selected cluster letter in modal
    const handleClusterSelect = async (clusterLetter: string) => {
        setSelectedCluster(clusterLetter);
        
        // Reset table state
        setClusterCustomers([]);
        setSelectedRows({});
        setSelectAll(false);

        // Check if cluster is selected
        if (!clusterLetter) {
            return;
        }

        // FILTER: Get customers where cluster starts with the selected letter
        const filtered = customers.filter(c => c.cluster.charAt(0) === clusterLetter);
        
        console.log('Selected Cluster Letter:', clusterLetter);
        console.log('Filtered Customers:', filtered);

        // Get last readings and arrears for each FILTERED customer
        const entries = await Promise.all(
            filtered.map(async (customer) => {
                try {
                    const lastReading = await window.electronAPI.bills.getLastReading(customer.id);
                    const arrears = await window.electronAPI.bills.getArrears(customer.id);
                    
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
                        cluster: customer.cluster, // Full cluster name for display
                    };
                } catch (error) {
                    console.error(`Error loading data for customer ${customer.id}:`, error);
                    return null;
                }
            })
        );
        
        const validEntries = entries.filter(Boolean);
        setClusterCustomers(validEntries);
    };

    // Calculate bill for a single row using backend
    const calculateBillForRow = async (rowId: string) => {
        const row = clusterCustomers.find(c => c.id === rowId);
        if (!row || !row.current_reading || parseFloat(row.current_reading.toString()) <= row.previous_reading) {
            setMessage({ type: 'error', text: 'Current reading must be greater than previous reading' });
            return;
        }

        try {
            const result = await window.electronAPI.bills.calculate(
                row.previous_reading,
                parseFloat(row.current_reading.toString()),
                parseFloat(row.discount) || 0,
                parseFloat(row.penalty) || 0
            );

            const totalDue = result.totalDue + row.arrears;

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
    };

    // Calculate all rows
    const calculateAllBills = async () => {
        if (clusterCustomers.length === 0) {
            setMessage({ type: 'error', text: 'No customers to calculate' });
            return;
        }

        setLoading(true);
        for (const customer of clusterCustomers) {
            if (customer.current_reading && parseFloat(customer.current_reading.toString()) > customer.previous_reading) {
                await calculateBillForRow(customer.id);
            }
        }
        setMessage({ type: 'success', text: 'Calculated bills for all customers with valid readings' });
        setLoading(false);
    };

    // Save all calculated bills
    const saveAllBills = async () => {
        const billsToSave = clusterCustomers.filter(c => c.isCalculated);

        if (billsToSave.length === 0) {
            setMessage({ type: 'error', text: 'No calculated bills to save' });
            return;
        }

        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const period = await window.electronAPI.bills.getBillingPeriod(today);
        const dueDate = await window.electronAPI.bills.getDueDate(today);
        
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
                    billing_date: today,
                    billing_period: period,
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
            loadRecentBills();
            handleCloseModal();
        }

        setLoading(false);
    };

    // Handle select all checkbox
    const handleSelectAll = (checked: boolean) => {
        setSelectAll(checked);
        const newSelected: Record<string, boolean> = {};
        clusterCustomers.forEach(customer => {
            newSelected[customer.id] = checked;
        });
        setSelectedRows(newSelected);
    };

    // Handle single row selection
    const handleRowSelect = (rowId: string, checked: boolean) => {
        setSelectedRows(prev => {
            const newSelected = { ...prev, [rowId]: checked };
            const allSelected = clusterCustomers.every(c => newSelected[c.id]);
            setSelectAll(allSelected);
            return newSelected;
        });
    };

    const formatCurrency = (amount: number) => {
        return `₱ ${amount.toFixed(2)}`;
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: { [key: string]: { label: string; class: string } } = {
            'paid': { label: 'Paid', class: 'status-paid' },
            'pending': { label: 'Pending', class: 'status-pending' },
            'overdue': { label: 'Overdue', class: 'status-overdue' },
            'partial': { label: 'Partial', class: 'status-partial' },
            'unpaid': { label: 'Unpaid', class: 'status-unpaid' }
        };
        const config = statusConfig[status.toLowerCase()] || { label: status, class: 'status-default' };
        return <span className={`status-badge ${config.class}`}>{config.label}</span>;
    };

    const filteredBills = allBills.filter((bill: any) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            bill.invoice_number?.toLowerCase().includes(searchLower) ||
            bill.customer_name?.toLowerCase().includes(searchLower) ||
            bill.cluster?.toLowerCase().includes(searchLower) ||
            bill.meter_number?.toLowerCase().includes(searchLower)
        );
    });

    // Table columns for modal
    const columnHelper = createColumnHelper<any>();
    
    const columns = useMemo(() => [
        columnHelper.accessor('customer_name', {
            header: 'Customer Name',
            cell: info => (
                <div className="customer-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="customer-avatar-small">
                        {info.getValue()?.charAt(0).toUpperCase()}
                    </span>
                    <span>{info.getValue()}</span>
                </div>
            ),
        }),
        columnHelper.accessor('meter_number', {
            header: 'Meter #',
        }),
        columnHelper.accessor('previous_reading', {
            header: 'Previous Reading',
            cell: info => <span className="reading-value">{info.getValue()}</span>,
        }),
        columnHelper.accessor('current_reading', {
            header: 'Current Reading',
            cell: info => (
                <input
                    type="number"
                    className="table-input"
                    value={info.getValue()}
                    onChange={async (e) => {
                        const newValue = e.target.value;
                        const rowId = info.row.original.id;
                        const prevReading = info.row.original.previous_reading;
                        
                        setClusterCustomers(prev =>
                            prev.map(customer =>
                                customer.id === rowId
                                    ? { ...customer, current_reading: newValue, isCalculated: false }
                                    : customer
                            )
                        );
                        
                        // Auto-calculate if valid reading entered
                        const currentVal = parseFloat(newValue);
                        if (newValue && currentVal > prevReading) {
                            setTimeout(() => calculateBillForRow(rowId), 100);
                        }
                    }}
                    placeholder="0"
                />
            ),
        }),
        columnHelper.accessor('discount', {
            header: 'Discount (cu.m)',
            cell: info => (
                <input
                    type="number"
                    className="table-input"
                    value={info.getValue()}
                    onChange={(e) => {
                        const newValue = e.target.value;
                        const rowId = info.row.original.id;
                        const currentReading = info.row.original.current_reading;
                        const prevReading = info.row.original.previous_reading;
                        
                        setClusterCustomers(prev =>
                            prev.map(customer =>
                                customer.id === rowId
                                    ? { ...customer, discount: newValue, isCalculated: false }
                                    : customer
                            )
                        );
                        
                        // Auto-recalculate if valid reading exists
                        const currentVal = parseFloat(currentReading?.toString() || '0');
                        if (currentReading && currentVal > prevReading) {
                            setTimeout(() => calculateBillForRow(rowId), 100);
                        }
                    }}
                    placeholder="0"
                />
            ),
        }),
        columnHelper.accessor('penalty', {
            header: 'Penalty (₱)',
            cell: info => (
                <input
                    type="number"
                    className="table-input"
                    value={info.getValue()}
                    onChange={(e) => {
                        const newValue = e.target.value;
                        setClusterCustomers(prev =>
                            prev.map(customer =>
                                customer.id === info.row.original.id
                                    ? { ...customer, penalty: newValue, isCalculated: false }
                                    : customer
                            )
                        );
                    }}
                    placeholder="0"
                />
            ),
        }),
        columnHelper.accessor('arrears', {
            header: 'Arrears',
            cell: info => formatCurrency(info.getValue()),
        }),
        columnHelper.accessor('totalDue', {
            header: 'Total Due',
            cell: info => {
                const value = info.getValue();
                return value > 0 ? (
                    <span className="amount-highlight">{formatCurrency(value)}</span>
                ) : (
                    <span className="text-muted">—</span>
                );
            },
        }),
        columnHelper.accessor('isCalculated', {
            id: 'status',
            header: 'Status',
            cell: info => (
                info.getValue() ? (
                    <span style={{ color: '#10b981', fontWeight: 500 }}>✓ Calculated</span>
                ) : (
                    <span style={{ color: '#9ca3af' }}>—</span>
                )
            ),
            enableSorting: false,
        }),
    ], [clusterCustomers]);

    const table = useReactTable({
        data: clusterCustomers,
        columns,
        state: {
            sorting,
            columnFilters,
            globalFilter,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className="billing-container">
            <div className="billing-content-wrapper">
                {/* Header Section */}
                <div className="billing-header">
                    <div className="header-left">
                        <h1 className="billing-title">Billing Management</h1>
                        <p className="billing-subtitle">
                            Generate and manage customer water bills
                        </p>
                    </div>
                </div>

                {/* Gradient Divider */}
                <div className="gradient-divider"></div>

                {/* Message Toast */}
                {message && (
                    <div className={`message-toast ${message.type}`}>
                        <span className="message-icon">{message.type === 'success' ? '✅' : '❌'}</span>
                        <span className="message-text">{message.text}</span>
                        <button className="message-close" onClick={() => setMessage(null)}>×</button>
                    </div>
                )}

                {/* Tabs - Only 2 tabs */}
                <div className="tabs-container">
                    <button 
                        className={`tab-button ${activeTab === 'entry' ? 'active' : ''}`}
                        onClick={() => setActiveTab('entry')}
                    >
                        <span className="tab-icon">📝</span>
                        Bill Entry
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        <span className="tab-icon">📊</span>
                        Billing History
                    </button>
                </div>

                {activeTab === 'entry' ? (
                    /* Bill Entry Tab */
                    <div className="bill-entry-section">
                        <div className="entry-actions">
                            <button 
                                className="btn-generate-bill"
                                onClick={handleOpenModal}
                            >
                                <span>⚡</span> Generate Bill
                            </button>
                        </div>

                        {/* Empty state or recent activity */}
                        <div className="entry-info-card">
                            <div className="info-icon">💡</div>
                            <h3>Generate New Bills</h3>
                            <p>Click the "Generate Bill" button above to create new bills for customers by cluster.</p>
                        </div>
                    </div>
                ) : (
                    /* Billing History Tab */
                    <div className="history-section">
                        <div className="history-header">
                            <h3 className="section-title">Recent Bills (All Customers)</h3>
                            <div className="search-wrapper">
                                <span className="search-icon">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search by invoice, customer, or meter..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                            </div>
                        </div>
                        
                        {filteredBills.length > 0 ? (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Invoice #</th>
                                            <th>Customer</th>
                                            <th>Cluster</th>
                                            <th>Meter #</th>
                                            <th>Billing Date</th>
                                            <th>Due Date</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredBills.map((bill: any) => (
                                            <tr key={bill.id}>
                                                <td className="invoice-number">{bill.invoice_number}</td>
                                                <td>
                                                    <div className="customer-cell">
                                                        <span className="customer-avatar-small">
                                                            {bill.customer_name?.charAt(0).toUpperCase()}
                                                        </span>
                                                        <span>{bill.customer_name}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="cluster-badge">{bill.cluster}</span>
                                                </td>
                                                <td className="meter-cell">{bill.meter_number}</td>
                                                <td>{bill.billing_date}</td>
                                                <td>{bill.due_date}</td>
                                                <td className="amount-cell">{formatCurrency(bill.total_amount_due)}</td>
                                                <td>{getStatusBadge(bill.status)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <span className="empty-icon">📊</span>
                                <p>No bills found</p>
                                <p className="empty-subtitle">Try adjusting your search</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Modal Overlay */}
                {showModal && (
                    <div className="modal-overlay" onClick={handleCloseModal}>
                        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div className="modal-header">
                                <h2 className="modal-title">Generate Bill</h2>
                                <button className="modal-close-btn" onClick={handleCloseModal}>×</button>
                            </div>

                            {/* Modal Body */}
                            <div className="modal-body">
                                {/* Cluster Selection */}
                                <div className="modal-cluster-selection">
                                    <label className="modal-label">Select Cluster</label>
                                    <select 
                                        className="customer-select"
                                        onChange={(e) => handleClusterSelect(e.target.value)}
                                        value={selectedCluster}
                                    >
                                        <option value="">-- Choose a cluster --</option>
                                        {clusters.map((cluster, index) => (
                                            <option key={index} value={cluster}>
                                                Cluster {cluster}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Table and Actions */}
                                {selectedCluster && clusterCustomers.length > 0 && (
                                    <>
                                        {/* Bulk Actions */}
                                        <div className="modal-actions-bar">
                                            <div className="modal-actions-info">
                                                <span>{clusterCustomers.length} customer(s) in Cluster {selectedCluster}</span>
                                            </div>
                                            <div className="modal-actions-buttons">
                                                <button
                                                    className="btn-save-bulk"
                                                    onClick={saveAllBills}
                                                    disabled={loading}
                                                >
                                                    💾 {loading ? 'Saving...' : 'Save All Bills'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Table */}
                                        <div className="table-container">
                                            <div className="table-toolbar">
                                                <div className="search-wrapper">
                                                    <span className="search-icon">🔍</span>
                                                    <input
                                                        type="text"
                                                        placeholder="Search customers..."
                                                        value={globalFilter}
                                                        onChange={(e) => setGlobalFilter(e.target.value)}
                                                        className="search-input"
                                                    />
                                                </div>
                                            </div>

                                            <div className="table-scroll">
                                                <table className="data-table">
                                                    <thead>
                                                        {table.getHeaderGroups().map(headerGroup => (
                                                            <tr key={headerGroup.id}>
                                                                {headerGroup.headers.map(header => (
                                                                    <th
                                                                        key={header.id}
                                                                        onClick={header.column.getToggleSortingHandler()}
                                                                        className={header.column.getCanSort() ? 'sortable' : ''}
                                                                    >
                                                                        {flexRender(
                                                                            header.column.columnDef.header,
                                                                            header.getContext()
                                                                        )}
                                                                        {{
                                                                            asc: ' 🔼',
                                                                            desc: ' 🔽',
                                                                        }[header.column.getIsSorted() as string] ?? null}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </thead>
                                                    <tbody>
                                                        {table.getRowModel().rows.map(row => (
                                                            <tr key={row.id} className={row.original.isCalculated ? 'row-calculated' : ''}>
                                                                {row.getVisibleCells().map(cell => (
                                                                    <td key={cell.id}>
                                                                        {flexRender(
                                                                            cell.column.columnDef.cell,
                                                                            cell.getContext()
                                                                        )}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Pagination */}
                                            <div className="pagination-container">
                                                <div className="pagination-info">
                                                    Page {table.getState().pagination.pageIndex + 1} of{' '}
                                                    {table.getPageCount()}
                                                </div>
                                                <div className="pagination-buttons">
                                                    <button
                                                        className="pagination-btn"
                                                        onClick={() => table.setPageIndex(0)}
                                                        disabled={!table.getCanPreviousPage()}
                                                    >
                                                        ⏮
                                                    </button>
                                                    <button
                                                        className="pagination-btn"
                                                        onClick={() => table.previousPage()}
                                                        disabled={!table.getCanPreviousPage()}
                                                    >
                                                        ◀
                                                    </button>
                                                    <button
                                                        className="pagination-btn"
                                                        onClick={() => table.nextPage()}
                                                        disabled={!table.getCanNextPage()}
                                                    >
                                                        ▶
                                                    </button>
                                                    <button
                                                        className="pagination-btn"
                                                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                                        disabled={!table.getCanNextPage()}
                                                    >
                                                        ⏭
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {selectedCluster && clusterCustomers.length === 0 && (
                                    <div className="empty-state">
                                        <span className="empty-icon">🏘️</span>
                                        <p>No customers found in Cluster {selectedCluster}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Billing;