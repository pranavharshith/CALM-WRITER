
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../../api/api';
import '../../styles/auth.css';
import { CheckIcon } from '../../icons/Icons';

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');
    const [resendEmail, setResendEmail] = useState('');
    const [resendStatus, setResendStatus] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link.');
            return;
        }

        verify();
    }, [token]);

    const verify = async () => {
        try {
            const result = await verifyEmail(token);
            if (result.success) {
                setStatus('success');
                if (result.accessToken) {
                    localStorage.setItem('accessToken', result.accessToken);
                    localStorage.setItem('calmstories_user', JSON.stringify(result.user));
                    localStorage.setItem('calmstories_internal_id', result.user.internalId);
                    localStorage.setItem('username', result.user.username);
                    localStorage.setItem('userRole', result.user.role);
                    // Tell App to reload the user state so the feed shows the
                    // freshly verified, logged-in user immediately.
                    window.dispatchEvent(new CustomEvent('auth:login'));
                }
                setTimeout(() => {
                    navigate('/community');
                }, 3000);
            } else {
                setStatus('error');
                setMessage(result.error || 'Verification failed.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('An unexpected error occurred.');
        }
    };

    const handleResend = async (e) => {
        e.preventDefault();
        if (!resendEmail) return;

        setResendStatus('sending');
        try {
            await resendVerification(resendEmail);
            setResendStatus('sent');
        } catch (error) {
            setResendStatus('error');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1 className="auth-title">Email Verification</h1>

                {status === 'verifying' && (
                    <div className="text-center" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <p>Verifying your email...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center" style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--sage-dark)', display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                            <CheckIcon size={32} />
                        </div>
                        <h2 style={{ color: 'var(--sage-dark)' }}>Verified!</h2>
                        <p>Your email has been successfully verified.</p>
                        <p>Redirecting you to the community...</p>
                        <Link to="/community" className="auth-button" style={{ display: 'inline-block', textDecoration: 'none', marginTop: '1rem' }}>Go to Community</Link>
                    </div>
                )}

                {status === 'error' && (
                    <div>
                        <div className="error-message" style={{ marginBottom: '1rem' }}>
                            {message}
                        </div>

                        <p style={{ margin: '0 0 1rem 0' }}>The link may be expired or invalid.</p>

                        <h3 style={{ margin: '0 0 0.5rem 0' }}>Resend Verification Email</h3>
                        <form onSubmit={handleResend} className="auth-form">
                            <div className="form-group">
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={resendEmail}
                                    onChange={e => setResendEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <button disabled={resendStatus === 'sending'} className="auth-button">
                                {resendStatus === 'sending' ? 'Sending...' : 'Resend Email'}
                            </button>
                            {resendStatus === 'sent' && <p className="success-message">Check your email for a new link.</p>}
                        </form>

                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <Link to="/login" className="link-button">Back to Login</Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
