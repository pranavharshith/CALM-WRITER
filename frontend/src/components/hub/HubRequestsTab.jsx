import React from 'react';

export default function HubRequestsTab({ pendingRequests, actingRequestId, onApproveRequest }) {
    if (pendingRequests.length === 0) {
        return (
            <div className="hubs-empty">
                <p className="hubs-empty__title">No pending requests</p>
                <p className="hubs-empty__copy">Join requests will appear here for you to review.</p>
            </div>
        );
    }

    return (
        <div className="hub-requests">
            {pendingRequests.map((request) => {
                const mark = (request.username || '?').trim().charAt(0).toUpperCase() || '?';
                const acting = actingRequestId === request._id;
                return (
                    <div key={request._id} className="hub-request">
                        <div className="hub-request__who">
                            <span className="hub-card__mark" aria-hidden="true">{mark}</span>
                            <div className="hub-request__copy">
                                <p className="hub-request__name">{request.username}</p>
                                <p className="hub-request__meta">
                                    {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : ''}
                                </p>
                            </div>
                        </div>
                        <div className="hub-request__actions">
                            <button
                                type="button"
                                onClick={() => onApproveRequest(request._id, true)}
                                disabled={!!actingRequestId}
                                className={`btn btn--primary${acting ? ' btn--loading' : ''}`}
                            >
                                {acting && <span className="spinner-ring" aria-hidden="true" />}
                                Approve
                            </button>
                            <button
                                type="button"
                                onClick={() => onApproveRequest(request._id, false)}
                                disabled={!!actingRequestId}
                                className="btn btn--secondary"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
