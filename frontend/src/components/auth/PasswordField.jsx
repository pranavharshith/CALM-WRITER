import React from 'react';
import { EyeIcon, EyeOffIcon, InfoIcon } from '../../icons/Icons';

export default function PasswordField({
    label,
    value,
    onChange,
    visible,
    onToggleVisibility,
    placeholder,
    name,
    autoComplete,
    minLength,
    required = true,
    showRequirements = false,
    showPasswordRequirements = false,
    onToggleRequirements,
}) {
    return (
        <div className="form-group">
            <label>{label}</label>
            <div className="password-input-wrapper">
                <input
                    type={visible ? "text" : "password"}
                    name={name}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    minLength={minLength}
                    required={required}
                />
                <button
                    type="button"
                    className="password-toggle"
                    onClick={onToggleVisibility}
                    aria-label="Toggle password visibility"
                >
                    {visible ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
                </button>
            </div>
            {showRequirements && (
                <>
                    <button
                        type="button"
                        className="info-button"
                        onClick={onToggleRequirements}
                        aria-label="Show password requirements"
                    >
                        <InfoIcon size={14} /> Requirements
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
                </>
            )}
        </div>
    );
}
