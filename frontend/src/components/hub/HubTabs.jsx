import React from 'react';

const TABS = [
    { id: 'stories', label: 'Stories' },
    { id: 'members', label: 'Members' },
    { id: 'chat', label: 'Chat', member: true },
    { id: 'requests', label: 'Requests', moderator: true },
];

export default function HubTabs({
    activeTab,
    onTabChange,
    isMember,
    isModerator,
    chatEnabled = true,
    pendingRequestCount,
    unreadChat = false,
}) {
    const visible = TABS.filter((tab) => {
        if (tab.member && (!isMember || !chatEnabled)) return false;
        if (tab.moderator && !isModerator) return false;
        return true;
    });

    return (
        <div className="hubs-tabs" aria-label="Hub sections">
            {visible.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    aria-pressed={activeTab === tab.id}
                    className={`hubs-tab${activeTab === tab.id ? ' hubs-tab--active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    {tab.label}
                    {tab.id === 'requests' && pendingRequestCount > 0 && (
                        <span className="hubs-tab__count">{pendingRequestCount}</span>
                    )}
                    {tab.id === 'chat' && unreadChat && (
                        <span className="hubs-tab__dot" aria-label="New messages" />
                    )}
                </button>
            ))}
        </div>
    );
}
