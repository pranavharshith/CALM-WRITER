import React from 'react';
import { themeLabel } from './hubLabels';

export default function HubHeader({
    hub,
    isMember,
    canLeave,
    joining = false,
    onBack,
    onJoin,
    onLeaveClick,
}) {
    const mark = (hub.name || '?').trim().charAt(0).toUpperCase() || '?';
    const description = (hub.description || '').trim();
    const members = Number(hub.memberCount) || 0;
    const stories = Number(hub.totalStories) || 0;
    const tags = Array.isArray(hub.tags) ? hub.tags.slice(0, 4) : [];
    const inviteOnly = hub.joinPolicy === 'invite_only' || hub.visibility === 'private';
    const joinLabel = hub.joinPolicy === 'open' ? 'Join hub' : 'Request to join';

    return (
        <>
            <button type="button" onClick={onBack} className="btn-back">← Back to Hubs</button>

            <header className="hub-room__hero">
                <div className="hub-room__identity">
                    <div className="hub-room__brand">
                        <span className="hub-room__mark" aria-hidden="true">{mark}</span>
                        <h1 className="hub-room__title">{hub.name}</h1>
                    </div>
                    <p className={`hub-room__lede${description ? '' : ' hub-room__lede--empty'}`}>
                        {description || 'No description yet.'}
                    </p>
                    <div className="hub-card__chips">
                        <span className="hub-chip">{themeLabel(hub.theme)}</span>
                        {hub.visibility === 'private' && (
                            <span className="hub-chip hub-chip--private">Private</span>
                        )}
                        {tags.map((tag) => (
                            <span key={tag} className="hub-chip hub-chip--tag">#{tag}</span>
                        ))}
                    </div>
                </div>

                <div className="hub-room__actions">
                    <div className="hub-room__stats">
                        <div className="hub-room__stat">
                            <span className="hub-room__stat-value">{members}</span>
                            <span className="hub-room__stat-label">{members === 1 ? 'member' : 'members'}</span>
                        </div>
                        <div className="hub-room__stat">
                            <span className="hub-room__stat-value">{stories}</span>
                            <span className="hub-room__stat-label">{stories === 1 ? 'story' : 'stories'}</span>
                        </div>
                    </div>
                    {!isMember && !inviteOnly && (
                        <button
                            type="button"
                            className={`btn btn--primary${joining ? ' btn--loading' : ''}`}
                            disabled={joining}
                            onClick={onJoin}
                        >
                            {joining && <span className="spinner-ring" aria-hidden="true" />}
                            {joining ? 'Sending…' : joinLabel}
                        </button>
                    )}
                    {!isMember && inviteOnly && (
                        <p className="hub-room__note">Invite only</p>
                    )}
                    {canLeave && (
                        <button type="button" className="btn btn--secondary" onClick={onLeaveClick}>
                            Leave hub
                        </button>
                    )}
                    {isMember && !canLeave && (
                        <p className="hub-room__note">You created this room</p>
                    )}
                </div>
            </header>
        </>
    );
}
