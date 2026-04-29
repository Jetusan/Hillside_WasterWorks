import React, { useEffect, useState } from 'react';
import AddCustomerModal from './AddCustomerModal'; // Adjust path as needed
import './customer.css';
import { IoSearchSharp } from "react-icons/io5";
import { FaRegUser } from "react-icons/fa";
import { PiUserCheckBold } from "react-icons/pi";
import { TbUserExclamation } from "react-icons/tb";
import { RiUserAddLine } from "react-icons/ri";
import { VscPreview } from "react-icons/vsc";
import { FiEdit3 } from "react-icons/fi";
import { BsThreeDotsVertical } from "react-icons/bs";

interface Customer {
    id: number;
    cluster: string;
    meter_number: string;
    customer_name: string;
    is_active: number;
}

const Customer: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.customers.getAll();
            setCustomers(data);
        } catch (error) {
            console.error('Error loading customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers
        .filter(customer => {
            const matchesSearch = 
                customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                customer.meter_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                customer.cluster.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesFilter = 
                filterStatus === 'all' ? true :
                filterStatus === 'active' ? customer.is_active === 1 :
                customer.is_active === 0;
            
            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            const extractParts = (cluster: string) => {
                const match = cluster.match(/^([A-E])(\d+)$/);
                if (match) {
                    return { letter: match[1], number: parseInt(match[2]) };
                }
                return { letter: cluster, number: 0 };
            };
            
            const aParts = extractParts(a.cluster);
            const bParts = extractParts(b.cluster);
            
            const letterCompare = aParts.letter.localeCompare(bParts.letter);
            if (letterCompare !== 0) return letterCompare;
            
            return aParts.number - bParts.number;
        });

    const stats = {
        total: customers.length,
        active: customers.filter(c => c.is_active === 1).length,
        inactive: customers.filter(c => c.is_active === 0).length,
        clusters: [...new Set(customers.map(c => c.cluster))].length
    };

    if (loading) {
        return (
            <div className="customer-container">
                <div className="loading-wrapper">
                    <div className="loading-spinner"></div>
                    <p>Loading customers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="customer-container">
            <div className="customer-content-wrapper">
                <div className="customer-header">
                    <div className="header-left">
                        <h1 className="customer-title">Customers</h1>
                        <p className="customer-subtitle">Manage and view all registered customers</p>
                    </div>
                    <div className="header-right">
                        <button className="add-customer-btn" onClick={() => setShowAddModal(true)}>
                            <span><RiUserAddLine /></span> Add Customer
                        </button>
                    </div>
                </div>

                <div className="gradient-divider"></div>

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

                <div className="controls-bar">
                    <div className="search-wrapper">
                        <span className="search-icon"><IoSearchSharp /></span>
                        <input
                            type="text"
                            placeholder="Search by name, meter number, or cluster..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <div className="filter-wrapper">
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Customers</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>
                </div>

                <div className="table-container">
                    <table className="customer-table">
                        <thead>
                            <tr>
                                <th>Cluster</th>
                                <th>Meter Number</th>
                                <th>Customer Name</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="no-results">
                                        <div className="no-results-content">
                                            <span className="no-results-icon"><IoSearchSharp /></span>
                                            <p>No customers found</p>
                                            <p className="no-results-subtitle">Try adjusting your search or filter</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map((c) => (
                                    <tr key={c.id} className="customer-row">
                                        <td><span className="cluster-badge">{c.cluster}</span></td>
                                        <td><span className="meter-number">{c.meter_number}</span></td>
                                        <td>
                                            <div className="customer-info">
                                                <span className="customer-avatar">{c.customer_name.charAt(0).toUpperCase()}</span>
                                                <span className="customer-name">{c.customer_name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${c.is_active ? 'active' : 'inactive'}`}>
                                                {c.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="action-btn view" title="View Details"><VscPreview /></button>
                                                <button className="action-btn edit" title="Edit Customer"><FiEdit3 /></button>
                                                <button className="action-btn more" title="More Options"><BsThreeDotsVertical /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <AddCustomerModal 
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={loadCustomers}
                    customers={customers}
                />
            </div>
        </div>
    );
};

export default Customer;