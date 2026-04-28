import React from 'react';
import { useNavigate } from 'react-router-dom';
import './home.css';

const Home: React.FC = () => {
    const navigate = useNavigate();

    const stats = [
        { label: 'Active Customers', value: '2,847', icon: '👥', trend: '+12%', trendUp: true },
        { label: 'Monthly Revenue', value: '$48,295', icon: '💰', trend: '+8%', trendUp: true },
        { label: 'Pending Payments', value: '143', icon: '💳', trend: '-3%', trendUp: false },
        { label: 'Water Usage (m³)', value: '12,482', icon: '💧', trend: '+5%', trendUp: true },
    ];

    const recentActivities = [
        { id: 1, action: 'New customer registered', name: 'John Smith', time: '5 minutes ago', icon: '👤' },
        { id: 2, action: 'Payment received', name: 'Sarah Johnson', time: '23 minutes ago', amount: '$245.00', icon: '💵' },
        { id: 3, action: 'Meter reading submitted', name: 'Zone A-12', time: '1 hour ago', reading: '1,245 m³', icon: '📊' },
        { id: 4, action: 'Bill generated', name: 'Michael Chen', time: '2 hours ago', amount: '$189.50', icon: '📄' },
        { id: 5, action: 'Service request', name: 'Unit 4B - Leak', time: '3 hours ago', priority: 'High', icon: '🔧' },
    ];

    const quickActions = [
        { label: 'Add Customer', icon: '➕', path: '/dashboard/customers' },
        { label: 'Record Payment', icon: '💳', path: '/dashboard/payments' },
        { label: 'Generate Bill', icon: '📋', path: '/dashboard/billing' },
        { label: 'View Reports', icon: '📈', path: '/dashboard/reports' },
    ];

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
                {stats.map((stat, index) => (
                    <div 
                        key={index} 
                        className="stat-card"
                    >
                        <div className="stat-header">
                            <span className="stat-icon">{stat.icon}</span>
                            <span className={`stat-trend ${stat.trendUp ? 'trend-up' : 'trend-down'}`}>
                                {stat.trend}
                            </span>
                        </div>
                        <div className="stat-value">{stat.value}</div>
                        <div className="stat-label">{stat.label}</div>
                    </div>
                ))}
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
                        {recentActivities.map((activity) => (
                            <div 
                                key={activity.id} 
                                className="activity-item"
                            >
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
                                        {activity.reading && (
                                            <span className="activity-badge reading">{activity.reading}</span>
                                        )}
                                        {activity.priority && (
                                            <span className={`activity-badge priority ${activity.priority.toLowerCase()}`}>
                                                {activity.priority}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;