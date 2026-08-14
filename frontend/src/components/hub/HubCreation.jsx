import React, { useState, useEffect } from 'react';
import { createHub, checkHubEligibility, applyForHubCreator, fetchMyHubCreatorApplication } from '../../api/api';
import useToast from '../../hooks/useToast';

export default function HubCreation({ onBack, onCreated }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        theme: 'general',
        tags: '',
        visibility: 'public',
        joinPolicy: 'approval',
        maxMembers: 50,
    });
    const [eligibility, setEligibility] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [essay, setEssay] = useState('');
    const [motivation, setMotivation] = useState('');
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState(false);
    const toast = useToast();

    useEffect(() => {
        checkEligibility();
    }, []);

    const checkEligibility = async () => {
        try {
            const result = await checkHubEligibility();
            setEligibility(result);
            if (!result.eligible) {
                setError(result.reason || 'You are not eligible to create hubs yet.');
            }
            if (result.canCreateHubs === false) {
                const mine = await fetchMyHubCreatorApplication();
                if (mine?.application?.status === 'pending') setApplied(true);
            }
        } catch (error) {
            setError('Failed to check eligibility');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const hubData = {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
            };

            const result = await createHub(hubData);
            if (result.success) {
                toast.success('Hub created');
                onCreated(result.hub);
            } else {
                setError(result.error || 'Failed to create hub');
            }
        } catch (error) {
            setError('Failed to create hub. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (e) => {
        e.preventDefault();
        if (applying || applied) return;
        setApplying(true);
        setError('');
        try {
            const result = await applyForHubCreator(essay.trim(), motivation.trim());
            if (!result?.success) {
                throw new Error(result?.error || 'Failed to submit application');
            }
            setApplied(true);
            toast.success('Application submitted');
        } catch (err) {
            setError(err.message || 'Failed to submit application');
            toast.error(err.message || 'Failed to submit application');
        } finally {
            setApplying(false);
        }
    };

    const themes = [
        { value: 'general', label: 'General' },
        { value: 'scifi', label: 'Sci-Fi' },
        { value: 'fantasy', label: 'Fantasy' },
        { value: 'poetry', label: 'Poetry' },
        { value: 'mystery', label: 'Mystery' },
        { value: 'horror', label: 'Horror' },
        { value: 'romance', label: 'Romance' },
        { value: 'nonfiction', label: 'Non-Fiction' },
        { value: 'other', label: 'Other' },
    ];

    if (eligibility && !eligibility.eligible) {
        return (
            <div className="page-shell">
                <div className="page-shell__inner page-shell__inner--narrow">
                    <button onClick={onBack} style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        marginBottom: '20px',
                    }}>
                        ← Back
                    </button>
                    <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>Create a Hub</h1>
                    <div style={{
                        padding: '20px',
                        background: 'var(--amber-light)',
                        border: '1px solid var(--amber-border)',
                        borderRadius: 'var(--radius-md)',
                    }}>
                        <h3 style={{ margin: '0 0 10px 0' }}>Not Eligible Yet</h3>
                        <p style={{ margin: 0, lineHeight: '1.6' }}>
                            {error}
                        </p>
                        {eligibility.requirements && (
                            <div style={{ marginTop: '15px' }}>
                                <strong>Requirements:</strong>
                                <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
                                    {eligibility.requirements.map((req, idx) => (
                                        <li key={idx} style={{ marginBottom: '5px' }}>{req}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {eligibility.canCreateHubs === false && (
                            <form onSubmit={handleApply} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {applied ? (
                                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                                        Your application is in. We’ll get back to you.
                                    </p>
                                ) : (
                                    <>
                                        <textarea
                                            className="form-textarea"
                                            placeholder="A short sample of how you write with others"
                                            value={essay}
                                            onChange={(e) => setEssay(e.target.value)}
                                            rows={5}
                                            required
                                        />
                                        <textarea
                                            className="form-textarea"
                                            placeholder="Why do you want to host a hub?"
                                            value={motivation}
                                            onChange={(e) => setMotivation(e.target.value)}
                                            rows={4}
                                            required
                                        />
                                        <button
                                            type="submit"
                                            disabled={applying}
                                            className={`btn btn--primary${applying ? ' btn--loading' : ''}`}
                                        >
                                            {applying && <span className="spinner-ring" aria-hidden="true" />}
                                            {applying ? 'Submitting…' : 'Apply to create hubs'}
                                        </button>
                                    </>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            fontFamily: 'var(--font-sans)',
            background: 'transparent',
        }} className="page-shell">
            <div className="page-shell__inner page-shell__inner--narrow">
                <button onClick={onBack} style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    marginBottom: '20px',
                }}>
                    ← Back
                </button>

                <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>Create a Collaborative Hub</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', lineHeight: '1.6' }}>
                    Start a community for writers to collaborate on stories together.
                </p>

                {error && (
                    <div style={{
                        padding: '15px',
                        background: 'var(--rose-light)',
                        border: '1px solid var(--rose-dark)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '20px',
                        color: 'var(--rose-dark)',
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{
                    background: 'var(--glass-bg-strong)',
                    padding: '30px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                }}>
                    {/* Hub Name */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            Hub Name *
                        </label>
                        <input
                            type="text"
                            required
                            minLength={3}
                            maxLength={50}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Sci-Fi Writers Collective"
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '15px',
                                fontFamily: 'var(--font-sans)',
                            }}
                        />
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>
                            3-50 characters
                        </div>
                    </div>

                    {/* Description */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe what your hub is about..."
                            maxLength={500}
                            rows={4}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '15px',
                                fontFamily: 'var(--font-sans)',
                                resize: 'vertical',
                            }}
                        />
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>
                            {formData.description.length}/500 characters
                        </div>
                    </div>

                    {/* Theme */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            Theme
                        </label>
                        <select
                            value={formData.theme}
                            onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '15px',
                                fontFamily: 'var(--font-sans)',
                            }}
                        >
                            {themes.map(theme => (
                                <option key={theme.value} value={theme.value}>{theme.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Tags */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            Tags
                        </label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            placeholder="space, dystopia, ai (comma separated)"
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '15px',
                                fontFamily: 'var(--font-sans)',
                            }}
                        />
                    </div>

                    {/* Visibility */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            Visibility
                        </label>
                        <select
                            value={formData.visibility}
                            onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '15px',
                                fontFamily: 'var(--font-sans)',
                            }}
                        >
                            <option value="public">Public - Discoverable by everyone</option>
                            <option value="unlisted">Unlisted - Join via link only</option>
                            <option value="private">Private - Invite-only</option>
                        </select>
                    </div>

                    {/* Join Policy */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            Join Policy
                        </label>
                        <select
                            value={formData.joinPolicy}
                            onChange={(e) => setFormData({ ...formData, joinPolicy: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '15px',
                                fontFamily: 'var(--font-sans)',
                            }}
                        >
                            <option value="open">Open - Auto-join for eligible users</option>
                            <option value="approval">Approval - Review join requests</option>
                            <option value="invite_only">Invite Only - Must be invited</option>
                        </select>
                    </div>

                    {/* Max Members */}
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                            Maximum Members
                        </label>
                        <input
                            type="number"
                            min={5}
                            max={200}
                            value={formData.maxMembers}
                            onChange={(e) => {
                                const max = parseInt(e.target.value, 10);
                                if (Number.isNaN(max)) return;
                                setFormData({ ...formData, maxMembers: max });
                            }}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '15px',
                                fontFamily: 'var(--font-sans)',
                            }}
                        />
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>
                            5-200 members
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`btn btn--primary${loading ? ' btn--loading' : ''}`}
                        style={{ width: '100%', padding: '12px', fontSize: '16px', fontWeight: 600 }}
                    >
                        {loading && <span className="spinner-ring" aria-hidden="true" />}
                        {loading ? 'Creating…' : 'Create Hub'}
                    </button>
                </form>
            </div>
        </div>
    );
}
