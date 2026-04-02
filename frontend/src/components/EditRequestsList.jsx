import React, { useState, useEffect } from 'react';
import { fetchEditRequests, voteOnEditRequest, respondToEditRequest } from '../api/api';

export default function EditRequestsList({ story, currentUserId, isAuthor }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

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
        try {
            const result = await voteOnEditRequest(requestId);
            if (result.success) {
                loadRequests(); // Reload to show updated vote count
            }
        } catch (error) {
            console.error('Failed to vote:', error);
        }
    };

    const handleRespond = async (requestId, approved) => {
        try {
            const result = await respondToEditRequest(requestId, approved);
            if (result.success) {
                if (approved) {
                    alert('Edit approved! The story has been updated.');
                    window.location.reload(); // Reload to show updated story
                } else {
                    loadRequests();
                }
            }
        } catch (error) {
            console.error('Failed to respond:', error);
        }
    };

    if (loading) return null;
    if (requests.length === 0) return null;

    return (
        <div style={{
            marginTop: '30px',
            padding: '20px',
            background: '#f9f9f9',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
        }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', marginTop: 0 }}>
                Edit Requests ({requests.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {requests.map(request => (
                    <div
                        key={request._id}
                        style={{
                            background: '#fff',
                            padding: '16px',
                            borderRadius: '6px',
                            border: '1px solid #ddd'
                        }}
                    >
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ fontSize: '14px', color: '#666' }}>
                                    Requested by <strong>@{request.requesterUsername}</strong>
                                </div>
                                <div style={{
                                    padding: '4px 12px',
                                    background: request.status === 'pending' ? '#fff3cd' : request.status === 'approved' ? '#d4edda' : '#f8d7da',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    textTransform: 'capitalize'
                                }}>
                                    {request.status}
                                </div>
                            </div>
                            <div style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                                "{request.reason}"
                            </div>
                        </div>

                        <div style={{ marginBottom: '12px', fontSize: '14px', color: '#333' }}>
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
                                        style={{
                                            padding: '8px 16px',
                                            background: request.votes?.some(v => v.userId === currentUserId) ? '#3d5a80' : 'transparent',
                                            color: request.votes?.some(v => v.userId === currentUserId) ? '#fff' : '#3d5a80',
                                            border: '1px solid #3d5a80',
                                            borderRadius: '4px',
                                            cursor: currentUserId === story.internalAuthorId ? 'not-allowed' : 'pointer',
                                            fontSize: '13px'
                                        }}
                                    >
                                        👍 {request.votes?.length || 0} / {request.voteThreshold}
                                    </button>
                                    <div style={{ fontSize: '13px', color: '#999' }}>
                                        {request.voteThreshold - (request.votes?.length || 0)} more votes needed
                                    </div>
                                </>
                            )}

                            {request.status === 'approved' && isAuthor && !request.authorResponse && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => handleRespond(request._id, true)}
                                        style={{
                                            padding: '8px 16px',
                                            background: '#7d9d74',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '13px'
                                        }}
                                    >
                                        ✓ Apply Edit
                                    </button>
                                    <button
                                        onClick={() => handleRespond(request._id, false)}
                                        style={{
                                            padding: '8px 16px',
                                            background: 'transparent',
                                            color: '#666',
                                            border: '1px solid #ddd',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '13px'
                                        }}
                                    >
                                        ✗ Decline
                                    </button>
                                </div>
                            )}

                            {request.authorResponse && (
                                <div style={{ fontSize: '13px', color: '#666' }}>
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
