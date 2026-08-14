import React, { useState, useEffect } from 'react';
import '../../styles/auth.css';
import { API_BASE } from '../../api/api';
import ThemeToggle from '../common/ThemeToggle';
import ForgotPasswordView from './ForgotPasswordView';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';

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
    // (dead code - CSRF token is read from the /auth/csrf-token response body)

    // Fetch CSRF token from server — read from response body, NOT document.cookie
    // (cookies from a different origin are inaccessible to JS)
    const fetchCSRFToken = async () => {
        try {
            const response = await fetch(`${API_BASE}/auth/csrf-token`, {
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

            const response = await fetch(`${API_BASE}/auth/signin`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': token
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

            // Re-enable the button BEFORE navigating so a failed auth-check
            // after login doesn't leave the form permanently stuck on
            // "Signing in..." with no way to retry.
            setLoading(false);
            setError('');
            onAuthenticated();
        } catch (err) {
            setError('Network error. Please try again.');
            setLoading(false);
        }
    };

    // ------------------------------------------------------------------
    // DEV ADMIN LOGIN — intentional bypass (keep it!)
    // ------------------------------------------------------------------
    // A one-click admin login for YOUR OWN machine, so you never have to
    // fight the sign-in flow while developing. It calls POST /auth/dev-login,
    // which is hard-disabled unless DEV_ADMIN_LOGIN=true and NODE_ENV is NOT
    // production — so this button can never work on a real deployment.
    //
    // DO NOT REMOVE THIS BUTTON. It is the supported way to skip auth in
    // dev (pair it with the .env flag, where this is documented). The
    // backend route lives in backend/routes/auth.js as /auth/dev-login and
    // is guarded there too — deleting either side silently breaks the other.
    //
    // The button only renders when the Vite dev server is running
    // (import.meta.env.DEV) AND the backend reports the route is enabled.
    // ------------------------------------------------------------------
    const handleDevLogin = async () => {
        if (loading) return;
        setLoading(true);
        setError('');
        setMessage('');

        try {
            // Use cached token from state, or fetch a fresh one
            const token = csrfToken || await fetchCSRFToken();
            if (!token) {
                setError('Security token not available. Please refresh the page.');
                setLoading(false);
                return;
            }

            const response = await fetch(`${API_BASE}/auth/dev-login`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': token
                },
                body: JSON.stringify({})
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Dev admin login failed');
                setLoading(false);
                return;
            }

            // Save JWT tokens and user data (same shape as signin)
            localStorage.setItem('accessToken', data.accessToken);
            // refreshToken is an HttpOnly cookie set by the server
            localStorage.setItem('calmstories_internal_id', data.user.internalId);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('userRole', data.user.role);

            setLoading(false);
            setError('');
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

            const response = await fetch(`${API_BASE}/auth/signup`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': token
                },
                body: JSON.stringify({ email, username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Sign up failed');
                setLoading(false);
                return;
            }

            // Account created — backend requires email verification and does NOT
            // return tokens/user. Trying to auto-login here crashes on
            // `data.user` (undefined) and makes a successful signup look like a
            // network failure. Instead: show the verification message and switch
            // to sign-in, pre-filling the identifier with the registered email.
            setLoading(false);
            setMessage(data.message || 'Account created. Please check your email to verify your account.');
            setMode('signin');
            setEmail('');
            setPassword('');
            setUsername(data.email || email);
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

            const response = await fetch(`${API_BASE}/auth/forgot-password`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': token
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
            // Backend already returns an honest message (in dev without SMTP it
            // says the OTP is printed on the SERVER console — not the browser).
            setMessage(data.message || 'OTP sent to your email.');
            setLoading(false);
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

            const response = await fetch(`${API_BASE}/auth/reset-password`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': token
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
            setLoading(false);
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
            <ForgotPasswordView
                otpSent={otpSent} resetEmail={resetEmail} setResetEmail={setResetEmail}
                otp={otp} setOtp={setOtp} newPassword={newPassword} setNewPassword={setNewPassword}
                showNewPassword={showNewPassword} setShowNewPassword={setShowNewPassword}
                showPasswordRequirements={showPasswordRequirements}
                setShowPasswordRequirements={setShowPasswordRequirements}
                error={error} message={message} loading={loading}
                handleForgotPassword={handleForgotPassword} handleResetPassword={handleResetPassword}
                setForgotPassword={setForgotPassword} setOtpSent={setOtpSent}
            />
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="auth-title">Welcome to Calm Stories</div>
                    <ThemeToggle size={16} />
                </div>
                <div className="auth-subtitle">Thoughtful writing, mindful community</div>

                {/* Pill Toggle */}
                <div className="auth-toggle">
                    <button type="button" className={`toggle-option ${mode === 'signin' ? 'active' : ''}`} onClick={() => { setMode('signin'); setError(''); }}>Sign In</button>
                    <button type="button" className={`toggle-option ${mode === 'signup' ? 'active' : ''}`} onClick={() => { setMode('signup'); setError(''); }}>Sign Up</button>
                </div>

                {mode === 'signin' && (
                    <SignInForm
                        username={username} setUsername={setUsername} password={password} setPassword={setPassword}
                        showPassword={showPassword} setShowPassword={setShowPassword}
                        rememberMe={rememberMe} setRememberMe={setRememberMe}
                        error={error} message={message} loading={loading}
                        handleSignIn={handleSignIn} handleDevLogin={handleDevLogin} setForgotPassword={setForgotPassword}
                    />
                )}

                {mode === 'signup' && (
                    <SignUpForm
                        email={email} setEmail={setEmail} username={username} setUsername={setUsername}
                        password={password} setPassword={setPassword}
                        showPassword={showPassword} setShowPassword={setShowPassword}
                        showPasswordRequirements={showPasswordRequirements}
                        setShowPasswordRequirements={setShowPasswordRequirements}
                        error={error} loading={loading} handleSignUp={handleSignUp}
                    />
                )}
            </div>
        </div>
    );
}

export default Auth;
