import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/sidebar/sidebar';

const Dashboard: React.FC = () => {
    const [user, setUser] = useState<any>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            navigate('/login');
        } else {
            setUser(JSON.parse(userData));
        }
    }, [navigate]);

    if (!user) {
        return null; // Or a simple loading indicator
    }

    return (
        <>
            <Sidebar />
            <Outlet />
        </>
    );
};

export default Dashboard;