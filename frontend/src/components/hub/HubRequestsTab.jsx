import React from 'react';

export default function HubRequestsTab({ pendingRequests, onApproveRequest }) {
    return (
        <div>
            {pendingRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                    No pending requests
                </div>
            ) : (
                pendingRequests.map((request) => (
                    <div key={request._id} style={{
                        padding: '15px',
                        background: 'var(--glass-bg-strong)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        marginBottom: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <div>
                            <div style={{ fontWeight: '600' }}>{request.username}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                {new Date(request.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => onApproveRequest(request._id, true)}
                                style={{
                                    padding: '8px 16px',
                                    background: 'var(--accent)',
                                    color: 'var(--accent-contrast)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }}
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => onApproveRequest(request._id, false)}
                                style={{
                                    padding: '8px 16px',
                                    background: 'var(--text-secondary)',
                                    color: 'var(--bg-page)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }}
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
