import React, { useState, useEffect } from 'react';
import './Auth.css';

function Auth({ onAuthenticated }) {
    const [mode, setMode] = useState('signin');
    const [forgotPassword, setForgotPassword] = useState(false);

    // Sign In/Up fields
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    // Forgot password fields
    const [resetEmail, setResetEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [otpSent, setOtpSent] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Password visibility toggles
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    // Password requirements visibility
    const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

    // CSRF token state
    const [csrfToken, setCSRFToken] = useState('');

    // Load remembered username on mount (never load password for security)
    useEffect(() => {
        const savedUsername = localStorage.getItem('remembered_username');

        if (savedUsername) {
            setUsername(savedUsername);
            setRememberMe(true);
        }

        // Fetch CSRF token on component mount
        fetchCSRFToken();
    }, []);

    // Helper to get CSRF token from cookie
    const getCSRFTokenFromCookie = () => {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrf-token') {
                return decodeURIComponent(value);
            }
        }
        return null;
    };

    // Fetch CSRF token from server — read from response body, NOT document.cookie
    // (cookies from a different origin are inaccessible to JS)
    const fetchCSRFToken = async () => {
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000';
            const response = await fetch(`${apiBase}/auth/csrf-token`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.token) {
                    setCSRFToken(data.token);
                    return data.token;
                }
            }
        } catch (err) {
            console.error('Failed to fetch CSRF token:', err);
        }
        return null;
    };

    const handleSignIn = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Use cached token from state, or fetch a fresh one
            const token = csrfToken || await fetchCSRFToken();
            if (!token) {
                setError('Security token not available. Please refresh the page.');
                setLoading(false);
                return;
            }

            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000';
            const response = await fetch(`${apiBase}/auth/signin`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': token
                },
                body: JSON.stringify({ usernameOrEmail: username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                let errorMsg = data.error || 'Sign in failed';
                // If it's an invalid credentials error, suggest password reset
                if (errorMsg.toLowerCase().includes('invalid credentials')) {
                    errorMsg += ' - Use "Forgot password?" to reset your password.';
                }
                setError(errorMsg);
                setLoading(false);
                return;
            }

            // Save username if "Remember Me" is checked (never save password)
            if (rememberMe) {
                localStorage.setItem('remembered_username', username);
            } else {
                localStorage.removeItem('remembered_username');
            }

            // Save JWT tokens and user data
            localStorage.setItem('accessToken', data.accessToken);
            // refreshToken is now an HttpOnly cookie
            localStorage.setItem('calmstories_internal_id', data.user.internalId);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('userRole', data.user.role);

            onAuthenticated();
        } catch (err) {
            setError('Network error. Please try again.');
            setLoading(false);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Use cached token from state, or fetch a fresh one
            const token = csrfToken || await fetchCSRFToken();
            if (!token) {
                setError('Security token not available. Please refresh the page.');
                setLoading(false);
                return;
            }

            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000';
            const response = await fetch(`${apiBase}/auth/signup`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': token
                },
                body: JSON.stringify({ email, username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Sign up failed');
                setLoading(false);
                return;
            }

            // Auto sign in after signup
            localStorage.setItem('accessToken', data.accessToken);
            // refreshToken is now an HttpOnly cookie
            localStorage.setItem('calmstories_internal_id', data.user.internalId);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('userRole', data.user.role);

            onAuthenticated();
        } catch (err) {
            setError('Network error. Please try again.');
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            // Use cached token from state, or fetch a fresh one
            const token = csrfToken || await fetchCSRFToken();
            if (!token) {
                setError('Security token not available. Please refresh the page.');
                setLoading(false);
                return;
            }

            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000';
            const response = await fetch(`${apiBase}/auth/forgot-password`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': token
                },
                body: JSON.stringify({ email: resetEmail })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to send OTP');
                setLoading(false);
                return;
            }

            setOtpSent(true);
            setMessage('OTP sent to your email. Check console for demo OTP.');
            setLoading(false);

            // Dev mode: show OTP
            if (data.devOtp) {
                console.log('🔑 Password Reset OTP:', data.devOtp);
            }
        } catch (err) {
            setError('Network error. Please try again.');
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            // Use cached token from state, or fetch a fresh one
            const token = csrfToken || await fetchCSRFToken();
            if (!token) {
                setError('Security token not available. Please refresh the page.');
                setLoading(false);
                return;
            }

            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000';
            const response = await fetch(`${apiBase}/auth/reset-password`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': token
                },
                body: JSON.stringify({ email: resetEmail, otp, newPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Password reset failed');
                setLoading(false);
                return;
            }

            setMessage('Password reset successfully! You can now sign in.');
            setTimeout(() => {
                setForgotPassword(false);
                setOtpSent(false);
                setMode('signin');
            }, 2000);
        } catch (err) {
            setError('Network error. Please try again.');
            setLoading(false);
        }
    };

    if (forgotPassword) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-title">Reset Password</div>

                    {!otpSent ? (
                        <form onSubmit={handleForgotPassword} className="auth-form">
                            <div className="form-group">
                                <label>Email Address</label>
                                <input
                                    type="email"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>

                            {error && <div className="error-message">{error}</div>}
                            {message && <div className="success-message">{message}</div>}

                            <button type="submit" className="auth-button" disabled={loading}>
                                {loading ? 'Sending...' : 'Send OTP'}
                            </button>

                            <button
                                type="button"
                                className="link-button"
                                onClick={() => setForgotPassword(false)}
                            >
                                Back to Sign In
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="auth-form">
                            <div className="form-group">
                                <label>Verification Code</label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="Enter 6-digit code"
                                    maxLength={6}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>New Password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="At least 8 characters"
                                        minLength={8}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        aria-label="Toggle password visibility"
                                    >
                                        {showNewPassword ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    className="info-button"
                                    onClick={() => setShowPasswordRequirements(!showPasswordRequirements)}
                                    aria-label="Show password requirements"
                                >
                                    ℹ️ Requirements
                                </button>
                                {showPasswordRequirements && (
                                    <div className="requirements-box">
                                        <h4>Password Requirements:</h4>
                                        <ul>
                                            <li>At least 8 characters long</li>
                                            <li>At least one uppercase letter (A-Z)</li>
                                            <li>At least one lowercase letter (a-z)</li>
                                            <li>At least one number (0-9)</li>
                                            <li>At least one special character (!@#$%^&*)</li>
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {error && <div className="error-message">{error}</div>}
                            {message && <div className="success-message">{message}</div>}

                            <button type="submit" className="auth-button" disabled={loading}>
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>

                            <button
                                type="button"
                                className="link-button"
                                onClick={() => {
                                    setForgotPassword(false);
                                    setOtpSent(false);
                                }}
                            >
                                Back to Sign In
                            </button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-title">Welcome to Calm Stories</div>
                <div className="auth-subtitle">Thoughtful writing, mindful community</div>

                {/* Pill Toggle */}
                <div className="auth-toggle">
                    <button
                        type="button"
                        className={`toggle-option ${mode === 'signin' ? 'active' : ''}`}
                        onClick={() => {
                            setMode('signin');
                            setError('');
                        }}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        className={`toggle-option ${mode === 'signup' ? 'active' : ''}`}
                        onClick={() => {
                            setMode('signup');
                            setError('');
                        }}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Sign In Form */}
                {mode === 'signin' && (
                    <form onSubmit={handleSignIn} className="auth-form" autoComplete="on">
                        <div className="form-group">
                            <label>Username or Email</label>
                            <input
                                type="text"
                                name="username"
                                autoComplete="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="username or email@example.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label="Toggle password visibility"
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        <div className="remember-me">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <span>Remember me</span>
                            </label>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button type="submit" className="auth-button" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>

                        <button
                            type="button"
                            className="link-button"
                            onClick={() => setForgotPassword(true)}
                        >
                            Forgot password?
                        </button>
                    </form>
                )}

                {/* Sign Up Form */}
                {mode === 'signup' && (
                    <form onSubmit={handleSignUp} className="auth-form">
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="john_doe"
                                pattern="[a-zA-Z0-9_]{3,20}"
                                required
                            />
                            <small className="input-hint">Letters, numbers, and underscore only</small>
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="At least 8 characters"
                                    minLength={8}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label="Toggle password visibility"
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                            <button
                                type="button"
                                className="info-button"
                                onClick={() => setShowPasswordRequirements(!showPasswordRequirements)}
                                aria-label="Show password requirements"
                            >
                                ℹ️ Requirements
                            </button>
                            {showPasswordRequirements && (
                                <div className="requirements-box">
                                    <h4>Password Requirements:</h4>
                                    <ul>
                                        <li>At least 8 characters long</li>
                                        <li>At least one uppercase letter (A-Z)</li>
                                        <li>At least one lowercase letter (a-z)</li>
                                        <li>At least one number (0-9)</li>
                                        <li>At least one special character (!@#$%^&*)</li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button type="submit" className="auth-button" disabled={loading}>
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default Auth;
