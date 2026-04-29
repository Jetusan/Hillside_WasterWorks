import React, { useState, useEffect } from 'react';
import { FaRegMoneyBillAlt } from "react-icons/fa";
import { FaHandHoldingWater } from "react-icons/fa";
import { FaUserFriends } from "react-icons/fa";
import { MdPendingActions } from "react-icons/md";



import './reports.css';

interface Bill {
    id: number;
    customer_id: number;
    invoice_number: string;
    total_amount_due: number;
    amount_paid: number;
    status: string;
    billing_date: string;
    usage_cubic_meter: number;
}

interface Customer {
    id: number;
    is_active: number;
}

const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'collections' | 'usage' | 'customers'>('collections');
    const [loading, setLoading] = useState(true);
    
    // Real data states
    const [totalCollections, setTotalCollections] = useState(0);
    const [monthlyUsage, setMonthlyUsage] = useState(0);
    const [activeCustomers, setActiveCustomers] = useState(0);
    const [pendingBills, setPendingBills] = useState(0);
    const [allBills, setAllBills] = useState<Bill[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);

    useEffect(() => {
        loadReportData();
    }, []);

    const loadReportData = async () => {
        setLoading(true);
        try {
            // Load all bills - use getRecent with large limit
            const bills = await window.electronAPI.bills.getRecent(1000);
            setAllBills(bills);

            // Load all customers
            const customerData = await window.electronAPI.customers.getAll();
            setCustomers(customerData);

            // Calculate total collections (sum of amount_paid)
            const collections = bills.reduce((sum: number, bill: Bill) => sum + (bill.amount_paid || 0), 0);
            setTotalCollections(collections);

            // Calculate monthly usage
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const monthlyBills = bills.filter((bill: Bill) => {
                const billDate = new Date(bill.billing_date);
                return billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear;
            });
            const usage = monthlyBills.reduce((sum: number, bill: Bill) => sum + (bill.usage_cubic_meter || 0), 0);
            setMonthlyUsage(usage);

            // Active customers
            const active = customerData.filter((c: Customer) => c.is_active === 1).length;
            setActiveCustomers(active);

            // Pending bills
            const pending = bills
                .filter((bill: Bill) => bill.status === 'Unpaid' || bill.status === 'Partial')
                .reduce((sum: number, bill: Bill) => sum + (bill.total_amount_due - bill.amount_paid), 0);
            setPendingBills(pending);

        } catch (error) {
            console.error('Error loading report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => `₱${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const summaryCards = [
        { 
            title: 'Total Collections', 
            value: formatCurrency(totalCollections),
            icon: <FaRegMoneyBillAlt /> 
        },
        { 
            title: 'Monthly Usage', 
            value: `${monthlyUsage.toLocaleString()} m³`, 
            icon: <FaHandHoldingWater /> 
        },
        { 
            title: 'Active Customers', 
            value: activeCustomers.toLocaleString(), 
            icon: <FaUserFriends /> 
        },
        { 
            title: 'Pending Bills', 
            value: formatCurrency(pendingBills), 
            icon: <MdPendingActions /> 
        },
    ];

    const recentReports = [
        { id: 1, name: 'Monthly Collection Report - April 2024', date: 'Apr 27, 2024', type: 'PDF', size: '245 KB' },
        { id: 2, name: 'Water Usage Summary - Q1 2024', date: 'Apr 15, 2024', type: 'Excel', size: '128 KB' },
        { id: 3, name: 'Customer Payment History', date: 'Apr 10, 2024', type: 'PDF', size: '890 KB' },
        { id: 4, name: 'Cluster A Billing Statement', date: 'Apr 05, 2024', type: 'PDF', size: '156 KB' },
    ];

    if (loading) {
        return (
            <div className="reports-container">
                <div className="loading-wrapper">
                    <div className="loading-spinner"></div>
                    <p>Loading reports...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="reports-container">
            {/* Header */}
            <div className="reports-header">
                <div>
                    <h1 className="reports-title">Reports & Analytics</h1>
                    <p className="reports-subtitle">View and generate billing reports</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-grid">
                {summaryCards.map((card, index) => (
                    <div key={index} className="summary-card">
                        <div className="summary-header">
                            <span className="summary-icon">{card.icon}</span>
                        </div>
                        <div className="summary-value">{card.value}</div>
                        <div className="summary-label">{card.title}</div>
                    </div>
                ))}
            </div>

            {/* Report Generator */}
            <div className="report-generator">
                <div className="generator-actions">
                        <button className="btn-preview">👁️ Preview</button>
                        <button className="btn-generate">📥 Generate Report</button>
                    </div>
                <h2 className="section-title">Generate Report</h2>
                <div className="generator-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Report Type</label>
                            <select className="form-select">
                                <option>Monthly Collection</option>
                                <option>Water Usage Summary</option>
                                <option>Customer Payment History</option>
                                <option>Unpaid Bills</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Date Range</label>
                            <select className="form-select">
                                <option>This Month</option>
                                <option>Last Month</option>
                                <option>This Quarter</option>
                                <option>This Year</option>
                                <option>Custom Range</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Cluster</label>
                            <select className="form-select">
                                <option>All Clusters</option>
                                <option>Cluster A</option>
                                <option>Cluster B</option>
                                <option>Cluster C</option>
                                <option>Cluster D</option>
                                <option>Cluster E</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Reports */}
            <div className="recent-reports">
                <h2 className="section-title">Recent Reports</h2>
                <div className="reports-list">
                    {recentReports.map((report) => (
                        <div key={report.id} className="report-item">
                            <div className="report-info">
                                <div className="report-icon">📄</div>
                                <div className="report-details">
                                    <div className="report-name">{report.name}</div>
                                    <div className="report-meta">
                                        <span>{report.date}</span>
                                        <span className="report-type">{report.type}</span>
                                        <span>{report.size}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="report-actions">
                                <button className="btn-download">⬇️ Download</button>
                                <button className="btn-view">View</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Reports;