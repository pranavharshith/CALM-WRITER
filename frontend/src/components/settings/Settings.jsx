import React, { useState, useEffect } from 'react';
import { fetchUserPreferences, updateUserPreferences } from '../../api/api';
import { SkeletonSettings } from '../skeletons';
import useMinLoadTime from '../../hooks/useMinLoadTime';
import useToast from '../../hooks/useToast';
import LanguagePicker from '../common/LanguagePicker';

const DEFAULTS = {
    calmMode: true,
    fontSize: 'medium',
    autoScroll: false,
    autoScrollSpeed: 'medium',
    preferredLanguage: 'en',
    dailyWordGoal: 300,
};

function normalizeSpeed(value) {
    if (value === 'slow' || value === 'medium' || value === 'fast') return value;
    const n = Number(value);
    if (!Number.isFinite(n)) return 'medium';
    if (n <= 33) return 'slow';
    if (n <= 66) return 'medium';
    return 'fast';
}

function normalizePrefs(raw = {}) {
    return {
        calmMode: raw.calmMode !== false,
        fontSize: ['small', 'medium', 'large'].includes(raw.fontSize) ? raw.fontSize : 'medium',
        autoScroll: !!raw.autoScroll,
        autoScrollSpeed: normalizeSpeed(raw.autoScrollSpeed),
        preferredLanguage: raw.preferredLanguage || 'en',
        dailyWordGoal: clampGoal(raw.dailyWordGoal),
    };
}

function clampGoal(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 300;
    return Math.min(2000, Math.max(50, Math.round(n)));
}

export default function Settings({ onBack }) {
    const [preferences, setPreferences] = useState(DEFAULTS);
    const [saved, setSaved] = useState(DEFAULTS);
    const [goalInput, setGoalInput] = useState(String(DEFAULTS.dailyWordGoal));
    const [rawLoading, setRawLoading] = useState(true);
    const loading = useMinLoadTime(rawLoading);
    const toast = useToast();
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadPreferences(); }, []);

    const loadPreferences = async () => {
        setRawLoading(true);
        try {
            const result = await fetchUserPreferences();
            if (result.preferences) {
                const next = normalizePrefs(result.preferences);
                setPreferences(next);
                setSaved(next);
                setGoalInput(String(next.dailyWordGoal));
            } else if (result.error) {
                toast.error(result.error);
            }
        } catch (error) {
            console.error('Failed to load preferences:', error);
            toast.error('Could not load settings');
        } finally {
            setRawLoading(false);
        }
    };

    const goalValue = clampGoal(goalInput);
    const dirty = JSON.stringify({ ...preferences, dailyWordGoal: goalValue }) !== JSON.stringify(saved);

    const handleSave = async () => {
        if (!dirty || saving) return;
        setSaving(true);
        try {
            const result = await updateUserPreferences({ ...preferences, dailyWordGoal: goalValue });
            if (result.success) {
                const next = normalizePrefs(result.preferences);
                setPreferences(next);
                setSaved(next);
                setGoalInput(String(next.dailyWordGoal));
                toast.success('Settings saved');
                window.dispatchEvent(new CustomEvent('preferencesUpdated', {
                    detail: { preferences: next }
                }));
            } else {
                toast.error(result.error || 'Failed to save settings');
            }
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <SkeletonSettings />;

    return (
        <div className="settings-page">
            <div className="settings-page__inner">
                <button type="button" onClick={onBack} className="btn-back mb-5">← Back</button>

                <h1 className="settings-page__heading">Settings</h1>
                <p className="settings-page__sub">How stories look and move while you read.</p>

                <div className="settings-card">
                    <div className="settings-section">
                        <h2 className="settings-section__title">Reading</h2>

                        <div className="settings-panel">
                            <div className="settings-row">
                                <div>
                                    <div className="settings-row__label-title" id="calm-mode-label">Calm Mode</div>
                                    <div className="settings-row__label-desc">
                                        Hide report, edit requests, and extra chrome in the reader
                                    </div>
                                </div>
                                <label className="toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={preferences.calmMode}
                                        onChange={(e) => setPreferences({ ...preferences, calmMode: e.target.checked })}
                                        aria-labelledby="calm-mode-label"
                                    />
                                    <span className="toggle-track" />
                                </label>
                            </div>
                        </div>

                        <div className="settings-block">
                            <label className="settings-block__label" id="lang-label">
                                Preferred language
                            </label>
                            <LanguagePicker
                                value={preferences.preferredLanguage}
                                onChange={(code) => setPreferences({ ...preferences, preferredLanguage: code })}
                            />
                        </div>

                        <div className="settings-block">
                            <div className="settings-block__label" id="font-label">Font size</div>
                            <div className="settings-option-group" role="group" aria-labelledby="font-label">
                                {['small', 'medium', 'large'].map((size) => (
                                    <button
                                        key={size}
                                        type="button"
                                        onClick={() => setPreferences({ ...preferences, fontSize: size })}
                                        className={`settings-option-btn${preferences.fontSize === size ? ' settings-option-btn--active' : ''}`}
                                        aria-pressed={preferences.fontSize === size}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="settings-panel">
                            <div className={`settings-row${preferences.autoScroll ? ' mb-4' : ''}`}>
                                <div>
                                    <div className="settings-row__label-title" id="auto-scroll-label">Auto-scroll</div>
                                    <div className="settings-row__label-desc">
                                        Drift through a story. Pause anytime by scrolling yourself.
                                    </div>
                                </div>
                                <label className="toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={preferences.autoScroll}
                                        onChange={(e) => setPreferences({ ...preferences, autoScroll: e.target.checked })}
                                        aria-labelledby="auto-scroll-label"
                                    />
                                    <span className="toggle-track" />
                                </label>
                            </div>

                            {preferences.autoScroll && (
                                <div>
                                    <div className="settings-block__label--sm" id="speed-label">Scroll speed</div>
                                    <div className="settings-option-group" role="group" aria-labelledby="speed-label">
                                        {['slow', 'medium', 'fast'].map((speed) => (
                                            <button
                                                key={speed}
                                                type="button"
                                                onClick={() => setPreferences({ ...preferences, autoScrollSpeed: speed })}
                                                className={`settings-option-btn${preferences.autoScrollSpeed === speed ? ' settings-option-btn--active' : ''}`}
                                                aria-pressed={preferences.autoScrollSpeed === speed}
                                            >
                                                {speed}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="settings-section">
                        <h2 className="settings-section__title">Writing</h2>
                        <div className="settings-block">
                            <label className="settings-block__label" htmlFor="daily-word-goal">
                                Daily word goal
                            </label>
                            <p className="settings-row__label-desc">
                                A quiet target for published words each UTC day. Default 300.
                            </p>
                            <input
                                id="daily-word-goal"
                                className="form-input"
                                type="number"
                                min={50}
                                max={2000}
                                step={50}
                                inputMode="numeric"
                                value={goalInput}
                                onChange={(e) => setGoalInput(e.target.value)}
                                onBlur={() => setGoalInput(String(clampGoal(goalInput)))}
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !dirty}
                        className={`settings-save-btn${saving ? ' btn--loading' : ''}`}
                    >
                        {saving && <span className="spinner-ring" aria-hidden="true" />}
                        {saving ? 'Saving…' : dirty ? 'Save settings' : 'Saved'}
                    </button>
                </div>
            </div>
        </div>
    );
}
