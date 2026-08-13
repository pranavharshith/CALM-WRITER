import React, { useState, useEffect } from 'react';
import { fetchEditRequests, voteOnEditRequest, respondToEditRequest } from '../api/api';
import { ThumbsUpIcon, CheckIcon, XIcon } from '../icons/Icons';
import { SkeletonEditRequestRow } from './SkeletonLoader';
import useToast from '../hooks/useToast';

export default function EditRequestsList({ story, currentUserId, isAuthor }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pulsingId, setPulsingId] = useState(null);
    const toast = useToast();

    useEffect(() => {
        loadRequests();
    }, [story._id]);

    const loadRequests = async () => {
        try {
            const result = await fetchEditRequests(story._id);
            setRequests(result.requests || []);
        } catch (error) {
            console.error('Failed to load edit requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (requestId) => {
        const already = requests.find(r => r._id === requestId)?.votes?.some(v => v.userId === currentUserId);
        if (already) return;

        setRequests(prev => prev.map(r => {
            if (r._id !== requestId) return r;
            return { ...r, votes: [...(r.votes || []), { userId: currentUserId }] };
        }));
        setPulsingId(requestId);
        setTimeout(() => setPulsingId(null), 220);

        try {
            const result = await voteOnEditRequest(requestId);
            if (result.success) {
                loadRequests();
            } else {
                loadRequests();
            }
        } catch (error) {
            console.error('Failed to vote:', error);
            loadRequests();
        }
    };

    const handleRespond = async (requestId, approved) => {
        try {
            const result = await respondToEditRequest(requestId, approved);
            if (result.success) {
                toast.success(approved ? 'Edit applied to the story' : 'Edit request declined');
                loadRequests();
            }
        } catch (error) {
            toast.error('Failed to respond to edit request');
            console.error('Failed to respond:', error);
        }
    };

    if (loading) {
        return (
            <div className="glass" style={{ marginTop: 30, padding: 20, borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <SkeletonEditRequestRow />
                    <SkeletonEditRequestRow />
                </div>
            </div>
        );
    }
    if (requests.length === 0) return null;

    return (
        <div className="glass" style={{
            marginTop: '30px',
            padding: '20px',
            borderRadius: 'var(--radius-lg)'
        }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', marginTop: 0, color: 'var(--text-primary)' }}>
                Edit Requests ({requests.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {requests.map(request => (
                    <div
                        key={request._id}
                        className="glass--strong"
                        style={{
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--glass-border)'
                        }}
                    >
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    Requested by <strong>@{request.requesterUsername}</strong>
                                </div>
                                <div style={{
                                    padding: '4px 12px',
                                    background: request.status === 'pending' ? 'var(--amber-light)' : request.status === 'approved' ? 'var(--sage-light)' : 'var(--rose-light)',
                                    color: request.status === 'pending' ? 'var(--amber)' : request.status === 'approved' ? 'var(--sage-dark)' : 'var(--rose-dark)',
                                    borderRadius: 'var(--radius-pill)',
                                    fontSize: '12px',
                                    textTransform: 'capitalize'
                                }}>
                                    {request.status}
                                </div>
                            </div>
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                "{request.reason}"
                            </div>
                        </div>

                        <div style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-primary)' }}>
                            <div>
                                <strong>Proposed changes:</strong>
                            </div>
                            {request.proposedTitle !== story.title && (
                                <div style={{ marginTop: '8px' }}>
                                    <em>Title:</em> {request.proposedTitle}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
                            {request.status === 'pending' && (
                                <>
                                    <button
                                        onClick={() => handleVote(request._id)}
                                        disabled={currentUserId === story.internalAuthorId}
                                        className="btn"
                                        style={{
                                            background: request.votes?.some(v => v.userId === currentUserId) ? 'var(--accent)' : 'transparent',
                                            color: request.votes?.some(v => v.userId === currentUserId) ? 'var(--accent-contrast)' : 'var(--accent)',
                                            border: '1px solid var(--accent)',
                                            cursor: currentUserId === story.internalAuthorId ? 'not-allowed' : 'pointer',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <ThumbsUpIcon size={13} />
                                        <span className={pulsingId === request._id ? 'vote-count--pulse' : undefined}>
                                            {request.votes?.length || 0}
                                        </span>
                                        {' / '}{request.voteThreshold}
                                    </button>
                                    <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                                        {request.voteThreshold - (request.votes?.length || 0)} more votes needed
                                    </div>
                                </>
                            )}

                            {request.status === 'approved' && isAuthor && !request.authorResponse && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleRespond(request._id, true)}
                                        className="btn btn--positive"
                                        style={{ fontSize: '13px' }}
                                    >
                                        <CheckIcon size={13} /> Apply Edit
                                    </button>
                                    <button
                                        onClick={() => handleRespond(request._id, false)}
                                        className="btn btn--secondary"
                                        style={{ fontSize: '13px' }}
                                    >
                                        <XIcon size={13} /> Decline
                                    </button>
                                </div>
                            )}

                            {request.authorResponse && (
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    <strong>Author {request.authorResponse.approved ? 'approved' : 'declined'}</strong>
                                    {request.authorResponse.note && `: "${request.authorResponse.note}"`}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
