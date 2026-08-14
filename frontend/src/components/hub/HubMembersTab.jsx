import React from 'react';
import { CrownIcon, StarIcon } from '../../icons/Icons';

export default function HubMembersTab({
    isModerator,
    isCreator = false,
    showInviteForm,
    onToggleInviteForm,
    inviteUsername,
    onInviteUsernameChange,
    onSendInvite,
    inviting = false,
    members,
    actingMemberId = null,
    onUpdateRole,
    onRemoveMember,
}) {
    return (
        <div className="hub-room__body">
            {isModerator && (
                <div className="hub-room__toolbar">
                    <button type="button" className="btn btn--primary" onClick={onToggleInviteForm}>
                        {showInviteForm ? 'Cancel' : 'Invite member'}
                    </button>
                </div>
            )}

            {showInviteForm && (
                <form onSubmit={onSendInvite} className="hub-invite-form">
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Username"
                        value={inviteUsername}
                        onChange={onInviteUsernameChange}
                        autoComplete="username"
                    />
                    <button
                        type="submit"
                        disabled={inviting}
                        className={`btn btn--primary${inviting ? ' btn--loading' : ''}`}
                    >
                        {inviting && <span className="spinner-ring" aria-hidden="true" />}
                        {inviting ? 'Sending…' : 'Send invite'}
                    </button>
                </form>
            )}

            {members.length === 0 ? (
                <div className="hubs-empty">
                    <p className="hubs-empty__title">No members yet</p>
                    <p className="hubs-empty__copy">This room is waiting for its first writer.</p>
                </div>
            ) : (
                <div className="hub-people">
                    {members.map((member) => {
                        const mark = (member.username || '?').trim().charAt(0).toUpperCase() || '?';
                        const contributions = Number(member.contributionCount) || 0;
                        return (
                            <div key={member.userInternalId} className="hub-person">
                                <div className="hub-person__who">
                                    <span className="hub-card__mark" aria-hidden="true">{mark}</span>
                                    <div className="hub-person__copy">
                                        <p className="hub-person__name">
                                            {member.username}
                                            {member.role === 'creator' && (
                                                <span className="hub-card__role hub-card__role--creator">
                                                    <CrownIcon size={12} /> Creator
                                                </span>
                                            )}
                                            {member.role === 'moderator' && (
                                                <span className="hub-card__role hub-card__role--moderator">
                                                    <StarIcon size={12} /> Moderator
                                                </span>
                                            )}
                                        </p>
                                        <p className="hub-person__meta">
                                            {contributions} {contributions === 1 ? 'contribution' : 'contributions'}
                                        </p>
                                    </div>
                                </div>
                                {member.role !== 'creator' && (isCreator || (isModerator && member.role === 'member')) && (
                                    <div className="hub-person__actions">
                                        {isCreator && member.role === 'member' && (
                                            <button
                                                type="button"
                                                className={`btn btn--secondary${actingMemberId === member.userInternalId ? ' btn--loading' : ''}`}
                                                disabled={!!actingMemberId}
                                                onClick={() => onUpdateRole(member.userInternalId, 'moderator')}
                                            >
                                                {actingMemberId === member.userInternalId && <span className="spinner-ring" aria-hidden="true" />}
                                                Promote
                                            </button>
                                        )}
                                        {isCreator && member.role === 'moderator' && (
                                            <button
                                                type="button"
                                                className={`btn btn--secondary${actingMemberId === member.userInternalId ? ' btn--loading' : ''}`}
                                                disabled={!!actingMemberId}
                                                onClick={() => onUpdateRole(member.userInternalId, 'member')}
                                            >
                                                {actingMemberId === member.userInternalId && <span className="spinner-ring" aria-hidden="true" />}
                                                Demote
                                            </button>
                                        )}
                                        {(isCreator || member.role === 'member') && (
                                            <button
                                                type="button"
                                                className="btn btn--ghost"
                                                disabled={!!actingMemberId}
                                                onClick={() => onRemoveMember(member.userInternalId)}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
