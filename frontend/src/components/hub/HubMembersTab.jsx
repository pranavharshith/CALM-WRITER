import React from 'react';
import { CrownIcon, StarIcon } from '../../icons/Icons';

export default function HubMembersTab({
    isModerator,
    showInviteForm,
    onToggleInviteForm,
    inviteUsername,
    onInviteUsernameChange,
    onSendInvite,
    members,
    onUpdateRole,
    onRemoveMember,
}) {
    return (
        <div>
            {isModerator && (
                <button
                    onClick={onToggleInviteForm}
                    style={{
                        marginBottom: '20px',
                        padding: '10px 20px',
                        background: 'var(--accent)',
                        color: 'var(--accent-contrast)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    {showInviteForm ? 'Cancel' : '+ Invite Member'}
                </button>
            )}

            {showInviteForm && (
                <form onSubmit={onSendInvite} style={{
                    marginBottom: '20px',
                    display: 'flex',
                    gap: '10px',
                }}>
                    <input
                        type="text"
                        placeholder="Enter username"
                        value={inviteUsername}
                        onChange={onInviteUsernameChange}
                        style={{
                            flex: 1,
                            padding: '10px',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            fontSize: '15px',
                            fontFamily: 'var(--font-serif)',
                        }}
                    />
                    <button type="submit" style={{
                        padding: '10px 20px',
                        background: 'var(--accent)',
                        color: 'var(--accent-contrast)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}>
                        Send Invite
                    </button>
                </form>
            )}

            <div style={{ display: 'grid', gap: '10px' }}>
                {members.map((member) => (
                    <div key={member.userInternalId} style={{
                        padding: '15px',
                        background: 'var(--glass-bg-strong)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '15px' }}>
                                {member.username}
                                {member.role === 'creator' && (
                                    <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--amber)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <CrownIcon size={12} /> Creator
                                    </span>
                                )}
                                {member.role === 'moderator' && (
                                    <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <StarIcon size={12} /> Moderator
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                {member.contributionCount} contributions
                            </div>
                        </div>
                        {isModerator && member.role !== 'creator' && (
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {member.role === 'member' && (
                                    <button
                                        onClick={() => onUpdateRole(member.userInternalId, 'moderator')}
                                        style={{
                                            padding: '6px 12px',
                                            background: 'var(--blue-light)',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                        }}
                                    >
                                        Promote
                                    </button>
                                )}
                                <button
                                    onClick={() => onRemoveMember(member.userInternalId)}
                                    style={{
                                        padding: '6px 12px',
                                        background: 'var(--rose-light)',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                    }}
                                >
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
