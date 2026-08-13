import React from 'react';
import PasswordField from './PasswordField';

export default function SignUpForm({
    email,
    setEmail,
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    showPasswordRequirements,
    setShowPasswordRequirements,
    error,
    loading,
    handleSignUp,
}) {
    return (
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
                    pattern="(?!.*__)[a-zA-Z0-9_]{3,20}"
                    title="3-20 characters. Letters, numbers, underscores only (no consecutive underscores)."
                    required
                />
                <small className="input-hint">Letters, numbers, and underscore only</small>
            </div>

            <PasswordField
                label="Password"
                value={password}
                onChange={setPassword}
                visible={showPassword}
                onToggleVisibility={() => setShowPassword(!showPassword)}
                placeholder="At least 8 characters"
                minLength={8}
                showRequirements
                showPasswordRequirements={showPasswordRequirements}
                onToggleRequirements={() => setShowPasswordRequirements(!showPasswordRequirements)}
            />

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="auth-button" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
            </button>
        </form>
    );
}
