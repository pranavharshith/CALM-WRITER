import React, { useState, useEffect } from 'react';
import { createHub, checkHubEligibility } from '../api/api';

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
                alert('Hub created successfully!');
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
            <div style={{
                fontFamily: 'Georgia, serif',
                background: '#fefefd',
                minHeight: '100vh',
                padding: '20px',
            }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
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
                        background: '#fff3cd',
                        border: '1px solid #ffc107',
                        borderRadius: '4px',
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
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            fontFamily: 'Georgia, serif',
            background: '#fefefd',
            minHeight: '100vh',
            padding: '20px',
        }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
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
                <p style={{ color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
                    Start a community for writers to collaborate on stories together.
                </p>

                {error && (
                    <div style={{
                        padding: '15px',
                        background: '#ffe0e0',
                        border: '1px solid #ff0000',
                        borderRadius: '4px',
                        marginBottom: '20px',
                        color: '#d44',
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{
                    background: '#fff',
                    padding: '30px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
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
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '15px',
                                fontFamily: 'Georgia, serif',
                            }}
                        />
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
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
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '15px',
                                fontFamily: 'Georgia, serif',
                                resize: 'vertical',
                            }}
                        />
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
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
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '15px',
                                fontFamily: 'Georgia, serif',
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
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '15px',
                                fontFamily: 'Georgia, serif',
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
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '15px',
                                fontFamily: 'Georgia, serif',
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
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '15px',
                                fontFamily: 'Georgia, serif',
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
                            onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '15px',
                                fontFamily: 'Georgia, serif',
                            }}
                        />
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                            5-200 members
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: loading ? '#ccc' : '#3d5a80',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '16px',
                            fontWeight: '600',
                        }}
                    >
                        {loading ? 'Creating...' : 'Create Hub'}
                    </button>
                </form>
            </div>
        </div>
    );
}
