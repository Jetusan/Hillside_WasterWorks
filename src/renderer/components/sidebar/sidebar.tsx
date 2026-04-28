import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './sidebar.css';

const Sidebar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { path: '/dashboard/home', label: 'Home', icon: '🏠' },
        { path: '/dashboard/customers', label: 'Customers', icon: '👥' },
        { path: '/dashboard/billing', label: 'Billing', icon: '💰' },
        { path: '/dashboard/payments', label: 'Payments', icon: '💳' },
        { path: '/dashboard/reports', label: 'Reports', icon: '📊' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <div className="sidebar-container">
            <div className="sidebar-header">
                <h2>
                    <span>💧</span>
                    <span>Water Billing</span>
                </h2>
            </div>
            
            <nav className="sidebar-nav">
                {menuItems.map((item, index) => (
                    <div
                        key={item.path}
                        className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
                        onClick={() => navigate(item.path)}
                    >
                        <span className="menu-icon">{item.icon}</span>
                        <span className="menu-label">{item.label}</span>
                    </div>
                ))}
            </nav>
            
            <div className="sidebar-footer">
                <button
                    onClick={handleLogout}
                    className="logout-button"
                >
                    <span className="logout-icon">🚪</span>
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;