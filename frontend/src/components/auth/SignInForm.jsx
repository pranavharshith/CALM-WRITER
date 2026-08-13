import React from 'react';
import { ZapIcon } from '../../icons/Icons';
import PasswordField from './PasswordField';

export default function SignInForm({
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    error,
    message,
    loading,
    handleSignIn,
    handleDevLogin,
    setForgotPassword,
}) {
    return (
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

            <PasswordField
                label="Password"
                value={password}
                onChange={setPassword}
                visible={showPassword}
                onToggleVisibility={() => setShowPassword(!showPassword)}
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
            />

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
            {message && <div className="success-message">{message}</div>}

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

            {/* DEV ADMIN LOGIN — dev-only shortcut to skip auth.
                Controlled by DEV_ADMIN_LOGIN in backend/.env and
                hard-disabled in production on the server. */}
            {import.meta.env.DEV && (
                <button
                    type="button"
                    className="dev-admin-login-button"
                    onClick={handleDevLogin}
                    disabled={loading}
                >
                    {loading ? 'Logging in...' : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <ZapIcon size={14} /> Dev Admin Login
                      </span>
                    )}
                </button>
            )}
        </form>
    );
}
