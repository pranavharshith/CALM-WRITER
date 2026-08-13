import React from 'react';
import PasswordField from './PasswordField';

export default function ForgotPasswordView({
    otpSent,
    resetEmail,
    setResetEmail,
    otp,
    setOtp,
    newPassword,
    setNewPassword,
    showNewPassword,
    setShowNewPassword,
    showPasswordRequirements,
    setShowPasswordRequirements,
    error,
    message,
    loading,
    handleForgotPassword,
    handleResetPassword,
    setForgotPassword,
    setOtpSent,
}) {
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
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                placeholder="Enter 8-digit code"
                                maxLength={8}
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                required
                            />
                        </div>

                        <PasswordField
                            label="New Password"
                            value={newPassword}
                            onChange={setNewPassword}
                            visible={showNewPassword}
                            onToggleVisibility={() => setShowNewPassword(!showNewPassword)}
                            placeholder="At least 8 characters"
                            minLength={8}
                            showRequirements
                            showPasswordRequirements={showPasswordRequirements}
                            onToggleRequirements={() => setShowPasswordRequirements(!showPasswordRequirements)}
                        />

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
