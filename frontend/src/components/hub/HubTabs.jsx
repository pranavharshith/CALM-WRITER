import React from 'react';

export default function HubTabs({ activeTab, onTabChange, isMember, isModerator, pendingRequestCount }) {
    return (
        <div style={{
            background: 'var(--glass-bg-strong)',
            borderBottom: '1px solid var(--border)',
            padding: '0 20px',
        }}>
            <div style={{
                maxWidth: '1000px',
                margin: '0 auto',
                display: 'flex',
                gap: '20px',
            }}>
                {['stories', 'members', isMember && 'chat', isModerator && 'requests'].filter(Boolean).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => onTabChange(tab)}
                        style={{
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === tab ? '2px solid var(--text-primary)' : '2px solid transparent',
                            padding: '15px 0',
                            cursor: 'pointer',
                            fontSize: '15px',
                            textTransform: 'capitalize',
                            color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: activeTab === tab ? '600' : '400',
                        }}
                    >
                        {tab}
                        {tab === 'requests' && pendingRequestCount > 0 && (
                            <span style={{
                                marginLeft: '6px',
                                background: 'var(--rose)',
                                color: 'var(--rose-contrast)',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontSize: '11px',
                            }}>
                                {pendingRequestCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
