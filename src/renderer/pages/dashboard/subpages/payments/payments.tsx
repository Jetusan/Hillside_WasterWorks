import React, { useState, useEffect } from 'react';
import './payments.css';

interface Payment {
    id: number;
    customer_id: number;
    payment_date: string;
    or_number: string;
    amount: number;
}

interface PaymentWithCustomer {
    id: number;
    customer_id: number;
    payment_date: string;
    or_number: string;
    amount: number;
    customer_name: string;
    meter_number: string;
    cluster: string;
}

interface Customer {
    id: number;
    cluster: string;
    meter_number: string;
    customer_name: string;
}

interface Bill {
    id: number;
    invoice_number: string;
    total_amount_due: number;
    amount_paid: number;
    due_date: string;
    status: string;
} 

interface Balance {
    totalDue: number;
    totalPaid: number;
    balance: number;
}

const Payments: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [unpaidBills, setUnpaidBills] = useState<Bill[]>([]);
    const [balance, setBalance] = useState<Balance | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [allPayments, setAllPayments] = useState<PaymentWithCustomer[]>([]);
    
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [orNumber, setOrNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'entry' | 'history'>('entry');
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');

    useEffect(() => {
        loadCustomers();
        loadAllPayments();
    }, []);

    const loadCustomers = async () => {
        const data = await window.electronAPI.customers.getAll();
        setCustomers(data);
    };

    const loadAllPayments = async () => {
        console.log('🔄 Loading all payments from database...');
        const data = await window.electronAPI.payments.getAll(100);
        console.log('📊 Raw payments from DB:', data);
        setAllPayments(data);
    };

    const handleSelectCustomer = async (customerId: number) => {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            setSelectedCustomer(customer);
            
            setUnpaidBills([]);
            setBalance(null);
            setPayments([]);
            
            const bills = await window.electronAPI.bills.getByCustomer(customerId);
            const unpaid = bills.filter(b => 
                b.status !== 'Paid' && (b.total_amount_due - b.amount_paid) > 0
            );
            setUnpaidBills(unpaid);
            
            const bal = await window.electronAPI.payments.getCustomerBalance(customerId);
            setBalance(bal);
            
            const customerPayments = await window.electronAPI.payments.getByCustomer(customerId);
            setPayments(customerPayments);
            
            if (bal.balance > 0) {
                setAmount(bal.balance.toString());
            } else {
                setAmount('');
            }
            
            setMessage(null);
        }
    };

    const handleProcessPayment = async () => {
        if (!selectedCustomer) {
            setMessage({ type: 'error', text: 'Please select a customer' });
            return;
        }
        
        if (!orNumber.trim()) {
            setMessage({ type: 'error', text: 'Please enter OR Number' });
            return;
        }
        
        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            setMessage({ type: 'error', text: 'Please enter a valid amount' });
            return;
        }

        setLoading(true);
        setMessage(null);

        const result = await window.electronAPI.payments.process({
            customer_id: selectedCustomer.id,
            payment_date: paymentDate,
            or_number: orNumber,
            amount: paymentAmount
        });

        if (result.success) {
            setMessage({ type: 'success', text: `Payment posted successfully! ${result.message || ''}` });
            
            setOrNumber('');
            setAmount('');
            setPaymentDate(new Date().toISOString().split('T')[0]);
            setPaymentMethod('cash');
            
            await handleSelectCustomer(selectedCustomer.id);
            await loadAllPayments();
        } else {
            setMessage({ type: 'error', text: result.error });
        }
        
        setLoading(false);
    };

    const formatCurrency = (amount: number) => {
        return `₱ ${amount.toFixed(2)}`;
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const filteredPayments = allPayments.filter(payment => {
        const searchLower = searchTerm.toLowerCase();
        return (
            payment.or_number?.toLowerCase().includes(searchLower) ||
            payment.customer_name?.toLowerCase().includes(searchLower) ||
            payment.meter_number?.toLowerCase().includes(searchLower)
        );
    });

    const getStatusBadge = (status: string) => {
        const statusConfig: { [key: string]: { label: string; class: string } } = {
            'Paid': { label: 'Paid', class: 'status-paid' },
            'Unpaid': { label: 'Unpaid', class: 'status-unpaid' },
            'Partial': { label: 'Partial', class: 'status-partial' },
            'Overdue': { label: 'Overdue', class: 'status-overdue' }
        };
        const config = statusConfig[status] || { label: status, class: 'status-default' };
        return <span className={`status-badge ${config.class}`}>{config.label}</span>;
    };

    const paymentMethods = [
        { value: 'cash', label: 'Cash', icon: '💵' },
        { value: 'gcash', label: 'GCash', icon: '📱' },
        { value: 'bank', label: 'Bank Transfer', icon: '🏦' },
        { value: 'check', label: 'Check', icon: '📝' }
    ];

    return (
        <div className="payments-container">
            <div className="payments-content-wrapper">
                {/* Header Section */}
                <div className="payments-header">
                    <div className="header-left">
                        <h1 className="payments-title">Payment Management</h1>
                        <p className="payments-subtitle">
                            Process and track customer payments
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

                {/* Tabs */}
                <div className="tabs-container">
                    <button 
                        className={`tab-button ${activeTab === 'entry' ? 'active' : ''}`}
                        onClick={() => setActiveTab('entry')}
                    >
                        <span className="tab-icon">💳</span>
                        New Payment
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        <span className="tab-icon">📜</span>
                        Payment History
                    </button>
                </div>

                {activeTab === 'entry' ? (
                    <div className="payment-entry-section">
                        {/* Customer Selection Card */}
                        <div className="selection-card">
                            <h3 className="card-title">Select Customer</h3>
                            <select 
                                className="customer-select"
                                onChange={(e) => handleSelectCustomer(parseInt(e.target.value))}
                                value={selectedCustomer?.id || ''}
                            >
                                <option value="">-- Choose a customer --</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>
                                        [{c.cluster}] {c.meter_number} - {c.customer_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedCustomer && balance && (
                            <>
                                {/* Customer Info & Balance Card */}
                                <div className="customer-balance-card">
                                    <div className="customer-info-section">
                                        <div className="customer-avatar-large">
                                            {selectedCustomer.customer_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="customer-details">
                                            <h3 className="customer-name-large">{selectedCustomer.customer_name}</h3>
                                            <div className="customer-meta">
                                                <span className="meta-item">
                                                    <span className="meta-icon">📍</span>
                                                    {selectedCustomer.cluster}
                                                </span>
                                                <span className="meta-item">
                                                    <span className="meta-icon">🔢</span>
                                                    {selectedCustomer.meter_number}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="balance-summary">
                                        <div className="balance-item">
                                            <span className="balance-label">Total Due</span>
                                            <span className="balance-value">{formatCurrency(balance.totalDue)}</span>
                                        </div>
                                        <div className="balance-item">
                                            <span className="balance-label">Total Paid</span>
                                            <span className="balance-value text-success">{formatCurrency(balance.totalPaid)}</span>
                                        </div>
                                        <div className="balance-divider"></div>
                                        <div className="balance-item total">
                                            <span className="balance-label">Outstanding Balance</span>
                                            <span className={`balance-value ${balance.balance > 0 ? 'text-danger' : 'text-success'}`}>
                                                {formatCurrency(balance.balance)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Unpaid Bills Table */}
                                {unpaidBills.length > 0 && (
                                    <div className="unpaid-bills-section">
                                        <h3 className="section-title">Unpaid Bills</h3>
                                        <div className="table-container">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Invoice #</th>
                                                        <th>Due Date</th>
                                                        <th>Total Due</th>
                                                        <th>Paid</th>
                                                        <th>Balance</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {unpaidBills.map((bill, index) => {
                                                        const billBalance = bill.total_amount_due - bill.amount_paid;
                                                        return (
                                                            <tr key={bill.id} style={{ '--i': index } as React.CSSProperties}>
                                                                <td className="invoice-number">{bill.invoice_number}</td>
                                                                <td>{formatDate(bill.due_date)}</td>
                                                                <td>{formatCurrency(bill.total_amount_due)}</td>
                                                                <td>{formatCurrency(bill.amount_paid)}</td>
                                                                <td className="amount-cell">{formatCurrency(billBalance)}</td>
                                                                <td>{getStatusBadge(bill.status)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Payment Form Card */}
                                <div className="payment-form-card">
                                    <h3 className="card-title">Payment Details</h3>
                                    <div className="payment-form-grid">
                                        <div className="form-group">
                                            <label className="form-label">
                                                <span className="label-icon">📅</span>
                                                Payment Date
                                            </label>
                                            <input 
                                                type="date"
                                                className="form-input"
                                                value={paymentDate}
                                                onChange={(e) => setPaymentDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">
                                                <span className="label-icon">🧾</span>
                                                OR Number
                                            </label>
                                            <input 
                                                type="text"
                                                className="form-input"
                                                value={orNumber}
                                                onChange={(e) => setOrNumber(e.target.value)}
                                                placeholder="Enter OR Number"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">
                                                <span className="label-icon">💰</span>
                                                Amount
                                            </label>
                                            <input 
                                                type="number"
                                                className="form-input amount-input"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                placeholder="0.00"
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">
                                                <span className="label-icon">💳</span>
                                                Payment Method
                                            </label>
                                            <div className="payment-methods">
                                                {paymentMethods.map(method => (
                                                    <button
                                                        key={method.value}
                                                        type="button"
                                                        className={`payment-method-btn ${paymentMethod === method.value ? 'active' : ''}`}
                                                        onClick={() => setPaymentMethod(method.value)}
                                                    >
                                                        <span className="method-icon">{method.icon}</span>
                                                        <span className="method-label">{method.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        className="btn-process"
                                        onClick={handleProcessPayment}
                                        disabled={loading}
                                    >
                                        <span>{loading ? '⏳' : '💳'}</span>
                                        {loading ? 'Processing...' : 'Process Payment'}
                                    </button>
                                </div>

                                {/* Recent Payments Table */}
                                {payments.length > 0 && (
                                    <div className="recent-payments-section">
                                        <h3 className="section-title">Recent Payments for {selectedCustomer.customer_name}</h3>
                                        <div className="table-container">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>OR Number</th>
                                                        <th>Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {payments.slice(0, 5).map((payment, index) => (
                                                        <tr key={payment.id} style={{ '--i': index } as React.CSSProperties}>
                                                            <td>{formatDate(payment.payment_date)}</td>
                                                            <td className="or-number">{payment.or_number}</td>
                                                            <td className="amount-cell">{formatCurrency(payment.amount)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    /* Payment History Tab */
                    <div className="history-section">
                        <div className="history-header">
                            <h3 className="section-title">Recent Payments (All Customers)</h3>
                            <div className="search-wrapper">
                                <span className="search-icon">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search by OR#, customer, or meter..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                            </div>
                        </div>
                        
                        {filteredPayments.length > 0 ? (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>OR Number</th>
                                            <th>Customer</th>
                                            <th>Cluster</th>
                                            <th>Meter #</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPayments.map((payment, index) => (
                                            <tr key={payment.id} style={{ '--i': index } as React.CSSProperties}>
                                                <td>{formatDate(payment.payment_date)}</td>
                                                <td className="or-number">{payment.or_number}</td>
                                                <td>
                                                    <div className="customer-cell">
                                                        <span className="customer-avatar-small">
                                                            {payment.customer_name?.charAt(0).toUpperCase()}
                                                        </span>
                                                        <span>{payment.customer_name}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="cluster-badge">{payment.cluster}</span>
                                                </td>
                                                <td className="meter-cell">{payment.meter_number}</td>
                                                <td className="amount-cell">{formatCurrency(payment.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <span className="empty-icon">💳</span>
                                <p>No payments found</p>
                                <p className="empty-subtitle">Try adjusting your search</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Payments;