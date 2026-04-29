import React from 'react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GrHomeRounded } from "react-icons/gr";
import { FaRegUser } from "react-icons/fa";
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import { MdOutlinePayments } from "react-icons/md";
import { TbReportSearch } from "react-icons/tb";
import { RiLogoutCircleLine } from "react-icons/ri";
import { ImWarning } from "react-icons/im";
import { GiMountaintop } from "react-icons/gi";

import './sidebar.css';

const Sidebar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const menuItems = [
        { path: '/dashboard/home', label: 'Home', icon: <GrHomeRounded /> },
        { path: '/dashboard/customers', label: 'Customers', icon: <FaRegUser /> },
        { path: '/dashboard/billing', label: 'Billing', icon: <LiaFileInvoiceDollarSolid /> },
        { path: '/dashboard/payments', label: 'Payments', icon: <MdOutlinePayments /> },
        { path: '/dashboard/reports', label: 'Reports', icon: <TbReportSearch /> },
    ];

    // Update handleLogout
    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    // Add confirm and cancel handlers
    const confirmLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const cancelLogout = () => {
        setShowLogoutConfirm(false);
    };

    return (
        <div className="sidebar-container">
            <div className="sidebar-header">
                <h2>
                    <span><GiMountaintop /></span>
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
                    <span className="logout-icon"><RiLogoutCircleLine/></span>
                    <span>Logout</span>
                </button>
            </div>

            {showLogoutConfirm && (
                <div className="logout-overlay" onClick={cancelLogout}>
                    <div className="logout-confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="logout-confirm-icon"><ImWarning /></div>
                        <h3>Confirm Logout</h3>
                        <p>Are you sure you want to logout?</p>
                        <div className="logout-confirm-buttons">
                            <button onClick={cancelLogout} className="btn-cancel">No</button>
                            <button onClick={confirmLogout} className="btn-confirm">Yes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;