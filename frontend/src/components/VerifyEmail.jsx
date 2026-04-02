
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../api/api';

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
                    localStorage.setItem('refreshToken', result.refreshToken);
                    localStorage.setItem('calmstories_user', JSON.stringify(result.user));
                    localStorage.setItem('calmstories_internal_id', result.user.internalId);
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
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">Email Verification</h1>

                {status === 'verifying' && (
                    <div className="text-center">
                        <div className="skeleton-line" style={{ width: '50%', margin: '20px auto' }}></div>
                        <p>Verifying your email...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center success-message">
                        <h2 style={{ color: '#2ecc71' }}>✓ Verified!</h2>
                        <p>Your email has been successfully verified.</p>
                        <p>Redirecting you to the community...</p>
                        <Link to="/community" className="btn btn-primary">Go to Community</Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="">
                        <div className="alert alert--error mb-4">
                            {message}
                        </div>

                        <p className="mb-4">The link may be expired or invalid.</p>

                        <h3 className="text-lg font-bold mb-2">Resend Verification Email</h3>
                        <form onSubmit={handleResend} className="auth-form">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={resendEmail}
                                onChange={e => setResendEmail(e.target.value)}
                                className="auth-input"
                                required
                            />
                            <button disabled={resendStatus === 'sending'} className="auth-btn">
                                {resendStatus === 'sending' ? 'Sending...' : 'Resend Email'}
                            </button>
                            {resendStatus === 'sent' && <p className="text-green-600 mt-2">Check your email for a new link.</p>}
                        </form>

                        <div className="auth-footer mt-4">
                            <Link to="/login">Back to Login</Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
