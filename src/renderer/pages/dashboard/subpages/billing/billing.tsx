import React, { useState, useEffect, useMemo } from 'react';
import GenerateBillModal from './generateBillBtn';
import './billing.css';
import { TbInvoice } from "react-icons/tb";
import { MdOutlineHistory } from "react-icons/md";
import { TbFileInvoice } from "react-icons/tb";
import { IoSearchSharp } from "react-icons/io5";
import { PiInvoiceLight } from "react-icons/pi";

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
    const [showModal, setShowModal] = useState(false);

    // Table state (for history tab if needed)
    const [sorting, setSorting] = useState<any[]>([]);
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

    // Modal handlers
    const handleOpenModal = () => setShowModal(true);
    const handleCloseModal = () => setShowModal(false);

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
                        <span className="tab-icon"><TbInvoice /></span>
                        Bill Entry
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        <span className="tab-icon"><MdOutlineHistory /></span>
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
                                <span><TbFileInvoice /></span> Generate Bill
                            </button>
                        </div>

                        {/* Empty state or recent activity */}
                        <div className="entry-info-card">
                            <div className="info-icon"><PiInvoiceLight /></div>
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
                                <span className="search-icon"><IoSearchSharp /></span>
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

                <GenerateBillModal
                    isOpen={showModal}
                    onClose={handleCloseModal}
                    customers={customers}
                    clusters={clusters}
                    onSave={loadRecentBills}
                />
            </div>
        </div>
    );
};

export default Billing;