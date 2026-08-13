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

        if (proposedText === story.text && proposedTitle === story.title) {
            setError('No changes proposed. Update the title or text before submitting.');
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
            background: 'var(--overlay-scrim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)'
        }}>
            <div className="glass glass--strong" style={{
                borderRadius: 'var(--radius-lg)',
                padding: '32px',
                maxWidth: '700px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto'
            }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px', marginTop: 0, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
                    Request Edit
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                    Propose changes to this story. It needs 10 community votes before the author can respond.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                            Proposed Title
                        </label>
                        <input
                            type="text"
                            value={proposedTitle}
                            onChange={(e) => setProposedTitle(e.target.value)}
                            className="form-input"
                            style={{ fontFamily: 'var(--font-serif)', fontSize: '14px' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                            Proposed Text
                        </label>
                        <textarea
                            value={proposedText}
                            onChange={(e) => setProposedText(e.target.value)}
                            rows={12}
                            className="form-textarea"
                            style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', lineHeight: '1.6', resize: 'vertical' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                            Reason for Edit *
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explain why this edit would improve the story..."
                            rows={3}
                            required
                            className="form-textarea"
                            style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', lineHeight: '1.6', resize: 'vertical' }}
                        />
                    </div>

                    {error && (
                        <div className="alert alert--error" style={{ marginBottom: '16px', fontSize: '14px' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn--secondary"
                            style={{ fontSize: '14px' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn btn--primary"
                            style={{ fontSize: '14px' }}
                        >
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
