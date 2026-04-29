import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './home.css';
import { FaRegUser } from "react-icons/fa";
import { PiUserCheckBold } from "react-icons/pi";
import { TbUserExclamation } from "react-icons/tb";
import { HiUsers } from "react-icons/hi";
import { AiOutlineUsergroupAdd } from "react-icons/ai";
import { MdPayments } from "react-icons/md";
import { TbFileInvoice } from "react-icons/tb";
import { TbReportAnalytics } from "react-icons/tb";

interface Customer {
    id: number;
    cluster: string;
    meter_number: string;
    customer_name: string;
    is_active: number;
}

interface Bill {
    id: number;
    total_amount_due: number;
    status: string;
}

interface Payment {
    id: number;
    amount: number;
}

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [recentBills, setRecentBills] = useState<Bill[]>([]);
    const [recentPayments, setRecentPayments] = useState<Payment[]>([]);

    // Calculate real stats
    const stats = {
        total: customers.length,
        active: customers.filter(c => c.is_active === 1).length,
        inactive: customers.filter(c => c.is_active === 0).length,
        clusters: [...new Set(customers.map(c => c.cluster))].length
    };

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        try {
            // Load customers
            const customerData = await window.electronAPI.customers.getAll();
            setCustomers(customerData);

            // Load recent bills
            const billData = await window.electronAPI.bills.getRecent(5);
            setRecentBills(billData);

            // Load recent payments - use getAll with limit
            const paymentData = await window.electronAPI.payments.getAll(5);
            setRecentPayments(paymentData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Format recent activities from real data
    const recentActivities = [
        ...recentBills.map(bill => ({
            id: bill.id,
            action: 'Bill generated',
            name: `Invoice #${bill.id}`,
            time: 'Recently',
            amount: `₱${bill.total_amount_due.toFixed(2)}`,
            icon: <TbFileInvoice />
        })),
        ...recentPayments.map(payment => ({
            id: payment.id,
            action: 'Payment received',
            name: `Payment #${payment.id}`,
            time: 'Recently',
            amount: `₱${payment.amount.toFixed(2)}`,
            icon: <MdPayments />
        }))
    ].slice(0, 5); // Limit to 5 most recent

    const quickActions = [
        { label: 'Add Customer', icon: <AiOutlineUsergroupAdd />, path: '/dashboard/customers' },
        { label: 'Record Payment', icon: <MdPayments />, path: '/dashboard/payments' },
        { label: 'Generate Bill', icon: <TbFileInvoice />, path: '/dashboard/billing' },
        { label: 'View Reports', icon: <TbReportAnalytics />, path: '/dashboard/reports' },
    ];

    if (loading) {
        return (
            <div className="home-container">
                <div className="loading-wrapper">
                    <div className="loading-spinner"></div>
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="home-container">
            {/* Welcome Section */}
            <div className="welcome-section">
                <div className="welcome-content">
                    <h1 className="welcome-title">
                        Welcome back, <span className="highlight">Admin</span>
                    </h1>
                    <p className="welcome-subtitle">
                        Here's what's happening with your water billing system today.
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-icon"><FaRegUser /></span>
                    </div>
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Total Customers</div>
                    <div className="stat-glow"></div>
                </div>
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-icon"><PiUserCheckBold /></span>
                    </div>
                    <div className="stat-value">{stats.active}</div>
                    <div className="stat-label">Active Customers</div>
                    <div className="stat-glow"></div>
                </div>
                <div className="stat-card">
                    <div className="stat-header">
                        <span className="stat-icon"><TbUserExclamation /></span>
                    </div>
                    <div className="stat-value">{stats.inactive}</div>
                    <div className="stat-label">Inactive Customers</div>
                    <div className="stat-glow"></div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="main-grid">
                {/* Quick Actions */}
                <div className="quick-actions-section">
                    <h2 className="section-title">Quick Actions</h2>
                    <div className="quick-actions-grid">
                        {quickActions.map((action, index) => (
                            <button
                                key={index}
                                className="quick-action-card"
                                onClick={() => navigate(action.path)}
                            >
                                <span className="quick-action-icon">{action.icon}</span>
                                <span className="quick-action-label">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="recent-activity-section">
                    <div className="section-header">
                        <h2 className="section-title">Recent Activity</h2>
                        <button className="view-all-link">View All →</button>
                    </div>
                    <div className="activity-list">
                        {recentActivities.length > 0 ? (
                            recentActivities.map((activity) => (
                                <div key={activity.id} className="activity-item">
                                    <div className="activity-icon">{activity.icon}</div>
                                    <div className="activity-content">
                                        <div className="activity-title">
                                            <span className="activity-action">{activity.action}</span>
                                            <span className="activity-name">{activity.name}</span>
                                        </div>
                                        <div className="activity-details">
                                            <span className="activity-time">{activity.time}</span>
                                            {activity.amount && (
                                                <span className="activity-badge amount">{activity.amount}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="no-activity">No recent activity</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;