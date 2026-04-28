import React, { useState } from 'react';

interface Customer {
    id: number;
    cluster: string;
    meter_number: string;
    customer_name: string;
    is_active: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customers: Customer[];
}

const AddCustomerModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, customers }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newCustomer, setNewCustomer] = useState({
        customer_name: '',
        meter_number: '',
        cluster: '',
        is_active: 1
    });

    if (!isOpen) return null;

    const handleClose = () => {
        if (!isSubmitting) {
            setNewCustomer({ customer_name: '', meter_number: '', cluster: '', is_active: 1 });
            onClose();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewCustomer(prev => ({
            ...prev,
            [name]: name === 'is_active' ? parseInt(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCustomer.customer_name.trim()) { alert('Please enter customer name'); return; }
        if (!newCustomer.meter_number.trim()) { alert('Please enter meter number'); return; }
        if (!newCustomer.cluster) { alert('Please select a cluster'); return; }

        setIsSubmitting(true);
        try {
            const clusterLetter = newCustomer.cluster;
            const regex = new RegExp(`^${clusterLetter}(\\d+)$`);
            let maxNum = 0;
            customers.forEach(c => {
                const match = c.cluster.match(regex);
                if (match) { const num = parseInt(match[1]); if (num > maxNum) maxNum = num; }
            });
            const clusterToSubmit = `${clusterLetter}${maxNum + 1}`;

            await window.electronAPI.customers.create({
                customer_name: newCustomer.customer_name.trim(),
                meter_number: newCustomer.meter_number.trim(),
                cluster: clusterToSubmit,
                is_active: String(newCustomer.is_active)
            } as any);

            handleClose();
            onSuccess();
        } catch (error: any) {
            alert('Error: ' + (error.message || 'Unknown error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Add New Customer</h2>
                    <button className="modal-close-btn" onClick={handleClose} disabled={isSubmitting}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Customer Name</label>
                            <input type="text" name="customer_name" value={newCustomer.customer_name}
                                onChange={handleInputChange} className="form-input"
                                placeholder="Enter customer name" required disabled={isSubmitting} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Meter Number</label>
                            <input type="text" name="meter_number" value={newCustomer.meter_number}
                                onChange={handleInputChange} className="form-input"
                                placeholder="Enter meter number" required disabled={isSubmitting} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Cluster *</label>
                            <select name="cluster" value={newCustomer.cluster}
                                onChange={handleInputChange} className="form-select"
                                required disabled={isSubmitting}>
                                <option value="">Select a cluster</option>
                                <option value="A">Cluster A</option>
                                <option value="B">Cluster B</option>
                                <option value="C">Cluster C</option>
                                <option value="D">Cluster D</option>
                                <option value="E">Cluster E</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select name="is_active" value={newCustomer.is_active}
                                onChange={handleInputChange} className="form-select" disabled={isSubmitting}>
                                <option value={1}>Active</option>
                                <option value={0}>Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="modal-cancel-btn" onClick={handleClose} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" className="modal-submit-btn" disabled={isSubmitting}>
                            {isSubmitting ? 'Adding...' : <><span>➕</span> Add Customer</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCustomerModal;