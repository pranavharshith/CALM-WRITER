import React from 'react';

export default function HubHeader({ hub, isMember, onBack, onJoin, onLeaveClick }) {
    return (
        <div style={{
            borderBottom: '1px solid var(--border)',
            background: 'var(--glass-bg-strong)',
            padding: '20px',
        }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        marginBottom: '15px',
                    }}
                >
                    ← Back to Hubs
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ margin: '0 0 10px 0', fontSize: '32px', fontWeight: '600' }}>
                            {hub.name}
                        </h1>
                        <p style={{ margin: '0 0 15px 0', color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6' }}>
                            {hub.description}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{
                                padding: '5px 12px',
                                background: 'var(--bg-subtle)',
                                borderRadius: '12px',
                                fontSize: '13px',
                            }}>
                                {hub.theme}
                            </span>
                            {hub.tags?.map((tag, idx) => (
                                <span key={idx} style={{
                                    padding: '5px 12px',
                                    background: 'var(--blue-light)',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    color: 'var(--accent)',
                                }}>
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        {!isMember ? (
                            <button
                                onClick={onJoin}
                                style={{
                                    padding: '10px 20px',
                                    background: 'var(--accent)',
                                    color: 'var(--accent-contrast)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                    fontWeight: '500',
                                }}
                            >
                                Request to Join
                            </button>
                        ) : (
                            <button
                                onClick={onLeaveClick}
                                style={{
                                    padding: '10px 20px',
                                    background: 'var(--text-secondary)',
                                    color: 'var(--bg-page)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                }}
                            >
                                Leave Hub
                            </button>
                        )}
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '10px' }}>
                            {hub.memberCount} members · {hub.totalStories} stories
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
