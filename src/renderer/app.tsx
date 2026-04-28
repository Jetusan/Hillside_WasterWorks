import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login/login';
import Dashboard from './pages/dashboard/dashboard';
import Customer from './pages/dashboard/subpages/customer/customer';
import Billing from './pages/dashboard/subpages/billing/billing';
import Payments from './pages/dashboard/subpages/payments/payments';
import Reports from './pages/dashboard/subpages/reports/reports';
import Home from './pages/dashboard/subpages/home/home';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                
                {/* Nested routes under Dashboard */}
                <Route path="/dashboard" element={<Dashboard />}>
                    <Route index element={<Navigate to="/dashboard/home" replace />} />
                    <Route path="home" element={<Home />} />
                    <Route path="customers" element={<Customer />} />
                    <Route path="billing" element={<Billing />} />
                    <Route path="payments" element={<Payments />} />
                    <Route path="reports" element={<Reports />} />
                </Route>
                
                <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;