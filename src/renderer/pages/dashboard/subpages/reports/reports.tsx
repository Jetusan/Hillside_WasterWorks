import React, { useState } from 'react';
import './reports.css';

const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'collections' | 'usage' | 'customers'>('collections');

    const summaryCards = [
        { title: 'Total Collections', value: '₱245,890', trend: '+12%', icon: '💰' },
        { title: 'Monthly Usage', value: '15,420 m³', trend: '+5%', icon: '💧' },
        { title: 'Active Customers', value: '2,847', trend: '+8%', icon: '👥' },
        { title: 'Pending Bills', value: '₱48,250', trend: '-3%', icon: '📋' },
    ];

    const recentReports = [
        { id: 1, name: 'Monthly Collection Report - April 2024', date: 'Apr 27, 2024', type: 'PDF', size: '245 KB' },
        { id: 2, name: 'Water Usage Summary - Q1 2024', date: 'Apr 15, 2024', type: 'Excel', size: '128 KB' },
        { id: 3, name: 'Customer Payment History', date: 'Apr 10, 2024', type: 'PDF', size: '890 KB' },
        { id: 4, name: 'Cluster A Billing Statement', date: 'Apr 05, 2024', type: 'PDF', size: '156 KB' },
    ];

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
                            <span className="summary-trend">{card.trend}</span>
                        </div>
                        <div className="summary-value">{card.value}</div>
                        <div className="summary-label">{card.title}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="tabs-container">
                <button 
                    className={`tab-button ${activeTab === 'collections' ? 'active' : ''}`}
                    onClick={() => setActiveTab('collections')}
                >
                    💰 Collections
                </button>
                <button 
                    className={`tab-button ${activeTab === 'usage' ? 'active' : ''}`}
                    onClick={() => setActiveTab('usage')}
                >
                    💧 Usage
                </button>
                <button 
                    className={`tab-button ${activeTab === 'customers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('customers')}
                >
                    👥 Customers
                </button>
            </div>

            {/* Report Generator */}
            <div className="report-generator">
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
                    <div className="generator-actions">
                        <button className="btn-preview">👁️ Preview</button>
                        <button className="btn-generate">📥 Generate Report</button>
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