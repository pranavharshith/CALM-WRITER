import React, { useState } from 'react';
import { createEditRequest } from '../api/api';

export default function EditRequestModal({ story, onClose, onSuccess }) {
    const [proposedText, setProposedText] = useState(story.text);
    const [proposedTitle, setProposedTitle] = useState(story.title);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!reason.trim()) {
            setError('Please explain why you want to edit this story');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const result = await createEditRequest(story._id, proposedText, proposedTitle, reason);

            if (result.success) {
                onSuccess();
            } else {
                setError(result.error || 'Failed to submit edit request');
            }
        } catch (err) {
            setError('Failed to submit edit request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '32px',
                maxWidth: '700px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto'
            }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px', marginTop: 0 }}>
                    Request Edit
                </h2>
                <p style={{ color: '#666', marginBottom: '24px', fontSize: '14px' }}>
                    Propose changes to this story. It needs 10 community votes before the author can respond.
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                            Proposed Title
                        </label>
                        <input
                            type="text"
                            value={proposedTitle}
                            onChange={(e) => setProposedTitle(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontFamily: 'Georgia, serif',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                            Proposed Text
                        </label>
                        <textarea
                            value={proposedText}
                            onChange={(e) => setProposedText(e.target.value)}
                            rows={12}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontFamily: 'Georgia, serif',
                                fontSize: '14px',
                                lineHeight: '1.6',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                            Reason for Edit *
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explain why this edit would improve the story..."
                            rows={3}
                            required
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontFamily: 'Georgia, serif',
                                fontSize: '14px',
                                lineHeight: '1.6',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px',
                            background: '#fee',
                            border: '1px solid #fcc',
                            borderRadius: '4px',
                            color: '#c33',
                            marginBottom: '16px',
                            fontSize: '14px'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                background: 'transparent',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                padding: '10px 20px',
                                background: submitting ? '#ccc' : '#3d5a80',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: submitting ? 'not-allowed' : 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
