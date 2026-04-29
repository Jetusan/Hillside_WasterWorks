import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuEyeClosed } from "react-icons/lu";
import { RxEyeOpen } from "react-icons/rx";
import './login.css';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');
    const [loading, setLoading] = useState(false);
    const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
    const [cooldownTime, setCooldownTime] = useState<number>(0);
    const navigate = useNavigate();

    // Cooldown timer for rate limiting
    useEffect(() => {
        if (cooldownTime > 0) {
            const timer = setInterval(() => {
                setCooldownTime(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setError('');
                        setWarning('');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [cooldownTime]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (cooldownTime > 0) {
            setError(`Please wait ${cooldownTime} seconds before trying again`);
            return;
        }
        
        setLoading(true);
        setError('');
        setWarning('');

        try {
            const result = await window.electronAPI.auth.login({ username, password });

            if (result.success && result.user) {
                localStorage.setItem('user', JSON.stringify(result.user));
                navigate('/dashboard');
            } else {
                setError(result.error || 'Login failed. Please check your credentials.');
                
                // Handle remaining attempts display
                if (result.remainingAttempts !== undefined && result.remainingAttempts > 0) {
                    setRemainingAttempts(result.remainingAttempts);
                }
                
                // Handle rate limiting (30-second block)
                if (result.rateLimited) {
                    // Parse the time from the error message
                    const timeMatch = result.error?.match(/(\d+)\s*seconds?/);
                    const cooldownSeconds = timeMatch ? parseInt(timeMatch[1]) : 30;
                    
                    setCooldownTime(cooldownSeconds);
                    setRemainingAttempts(0);
                }
                
                // Handle database account lock
                if (result.locked_until) {
                    const lockTime = new Date(result.locked_until);
                    const secondsLeft = Math.ceil((lockTime.getTime() - Date.now()) / 1000);
                    
                    if (secondsLeft > 0) {
                        setCooldownTime(secondsLeft);
                    }
                    setRemainingAttempts(0);
                }
                
                // Show warning messages
                if (result.warning) {
                    setWarning(result.warning);
                }
                
                // Clear password on failed attempt
                setPassword('');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Clear errors when user starts typing
    const handleUsernameChange = (value: string) => {
        setUsername(value);
        setError('');
        setWarning('');
        setRemainingAttempts(null);
    };

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        setError('');
        setWarning('');
    };

    return (
        <div className="login-container">
            {/* Left Panel */}
            <div className="login-left">
                <h1 className="brand-logo">Hillside Water</h1>
                <p className="brand-tagline">Billing Management System</p>
                
                <div className="feature-card">
                    <h3>Everything you need</h3>
                    <ul className="feature-list">
                        <li>Customer Management</li>
                        <li>Billing & Invoicing</li>
                        <li>Payment Tracking</li>
                        <li>Real-time Reports</li>
                    </ul>
                </div>
            </div>

            {/* Right Panel */}
            <div className="login-right">
                <div className="login-header">
                    <h2>Welcome back</h2>
                    <p className="login-subtitle">Sign in to your account</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username</label>
                        <input 
                            type="text" 
                            value={username} 
                            onChange={(e) => handleUsernameChange(e.target.value)} 
                            placeholder="Enter your username"
                            disabled={loading || cooldownTime > 0}
                            autoComplete="username"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Password</label>
                        <div className="password-input-wrapper">
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => handlePasswordChange(e.target.value)}
                                required
                                disabled={loading || cooldownTime > 0}
                                autoComplete="current-password"
                                placeholder="Enter your password"
                            />
                            <button 
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <RxEyeOpen /> : <LuEyeClosed />}
                            </button>
                        </div>
                    </div>
                    
                    {/* Rate Limit Warning */}
                    {warning && !error && (
                        <div className="warning-message">
                            <span className="warning-icon">⚠️</span>
                            {warning}
                        </div>
                    )}
                    
                    {/* Attempts Remaining Indicator */}
                    {remainingAttempts !== null && remainingAttempts > 0 && !error && (
                        <div className="attempts-info">
                            <span className="attempts-icon">🔒</span>
                            {remainingAttempts} login attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                        </div>
                    )}
                    
                    {/* Cooldown Timer */}
                    {cooldownTime > 0 && (
                        <div className="cooldown-info">
                            <span className="cooldown-icon">⏳</span>
                            Please wait {cooldownTime} second{cooldownTime !== 1 ? 's' : ''}
                        </div>
                    )}
                    
                    {/* Error Message */}
                    {error && <div className="error-message">{error}</div>}
                    
                    <button 
                        type="submit" 
                        className="login-button" 
                        disabled={loading || cooldownTime > 0}
                    >
                        {loading ? 'Signing in...' : 
                        cooldownTime > 0 ? `Wait ${cooldownTime}s` : 
                        'Sign In'}
                    </button>
                </form>

                <div className="test-credentials">
                    <strong>Developer:</strong> Jetusan
                </div>
            </div>
        </div>
    );
}

export default Login;