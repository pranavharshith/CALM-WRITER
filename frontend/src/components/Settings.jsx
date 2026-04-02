import React, { useState, useEffect } from 'react';
import { fetchUserPreferences, updateUserPreferences, fetchCurrentUser } from '../api/api';
import { SkeletonSettings } from './SkeletonLoader';
import useMinLoadTime from '../hooks/useMinLoadTime';
import LanguagePicker from './LanguagePicker';

export default function Settings({ onBack, user, setUser }) {
    const [preferences, setPreferences] = useState({
        calmMode: true,
        fontSize: 'medium',
        autoScroll: false,
        autoScrollSpeed: 'medium',
        preferredLanguage: 'en',
    });
    const [rawLoading, setRawLoading] = useState(true);
    const loading = useMinLoadTime(rawLoading, 1000);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => { loadPreferences(); }, []);

    const loadPreferences = async () => {
        setRawLoading(true);
        try {
            const result = await fetchUserPreferences();
            if (result.preferences) {
                setPreferences({
                    calmMode: result.preferences.calmMode ?? true,
                    fontSize: result.preferences.fontSize || 'medium',
                    autoScroll: result.preferences.autoScroll ?? false,
                    autoScrollSpeed: result.preferences.autoScrollSpeed || 'medium',
                    preferredLanguage: result.preferences.preferredLanguage || 'en',
                });
            }
        } catch (error) {
            console.error('Failed to load preferences:', error);
        } finally {
            setRawLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            const result = await updateUserPreferences(preferences);
            if (result.success) {
                setMessage('Settings saved successfully!');
                setTimeout(() => setMessage(''), 3000);
                window.dispatchEvent(new CustomEvent('preferencesUpdated', {
                    detail: { preferences: result.preferences }
                }));
            } else {
                setMessage('Failed to save settings');
            }
        } catch (error) {
            setMessage('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <SkeletonSettings />;

    const isSuccess = message.includes('success');

    return (
        <div className="settings-page">
            <div className="settings-page__inner">
                <button onClick={onBack} className="btn-back mb-5">← Back</button>

                <h1 className="settings-page__heading">Settings</h1>
                <p className="settings-page__sub">Customize your reading and writing experience</p>

                {message && (
                    <div className={`alert ${isSuccess ? 'alert--success' : 'alert--error'} mb-5`}>
                        {message}
                    </div>
                )}

                <div className="settings-card">
                    {/* Reading Preferences */}
                    <div className="settings-section">
                        <h2 className="settings-section__title">Reading Preferences</h2>

                        {/* Calm Mode toggle */}
                        <div className="settings-panel">
                            <div className="settings-row">
                                <div>
                                    <div className="settings-row__label-title">Calm Mode</div>
                                    <div className="settings-row__label-desc">
                                        Minimalist reading experience with distraction-free layout
                                    </div>
                                </div>
                                <label className="toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={preferences.calmMode}
                                        onChange={(e) => setPreferences({ ...preferences, calmMode: e.target.checked })}
                                    />
                                    <span className="toggle-track" />
                                </label>
                            </div>
                        </div>

                        {/* Preferred Language */}
                        <div className="settings-block">
                            <label className="settings-block__label">
                                Preferred Language (for Translation)
                            </label>
                            <LanguagePicker
                                value={preferences.preferredLanguage || 'en'}
                                onChange={(code) => setPreferences({ ...preferences, preferredLanguage: code })}
                            />
                        </div>

                        {/* Font Size */}
                        <div className="settings-block">
                            <label className="settings-block__label">Font Size</label>
                            <div className="settings-option-group">
                                {['small', 'medium', 'large'].map((size) => (
                                    <button
                                        key={size}
                                        onClick={() => setPreferences({ ...preferences, fontSize: size })}
                                        className={`settings-option-btn${preferences.fontSize === size ? ' settings-option-btn--active' : ''}`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Auto Scroll */}
                        <div className="settings-panel">
                            <div className="settings-row mb-4">
                                <div>
                                    <div className="settings-row__label-title">Auto-Scroll</div>
                                    <div className="settings-row__label-desc">
                                        Automatically scroll through stories at your preferred pace
                                    </div>
                                </div>
                                <label className="toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={preferences.autoScroll}
                                        onChange={(e) => setPreferences({ ...preferences, autoScroll: e.target.checked })}
                                    />
                                    <span className="toggle-track" />
                                </label>
                            </div>

                            {preferences.autoScroll && (
                                <div>
                                    <label className="settings-block__label--sm">Scroll Speed</label>
                                    <div className="settings-option-group">
                                        {['slow', 'medium', 'fast'].map((speed) => (
                                            <button
                                                key={speed}
                                                onClick={() => setPreferences({ ...preferences, autoScrollSpeed: speed })}
                                                className={`settings-option-btn${preferences.autoScrollSpeed === speed ? ' settings-option-btn--active' : ''}`}
                                            >
                                                {speed}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Save */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="settings-save-btn"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}
