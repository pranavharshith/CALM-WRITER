import React, { useState, useEffect, useRef } from 'react';
import {
    fetchHubDetails,
    fetchHubMembers,
    fetchHubStories,
    fetchHubChat,
    postHubChatMessage,
    requestJoinHub,
    leaveHub,
    sendHubInvite,
    removeHubMember,
    updateMemberRole,
    respondToInvite,
    fetchPendingRequests,
    approveJoinRequest,
    createHubStory,
    translateText,
    fetchUserPreferences
} from '../api/api';
import DualArrowIcon from '../icons/DualArrowIcon';

function ChatMessage({ msg, targetLang }) {
    const [translatedText, setTranslatedText] = useState(null);
    const [showTranslated, setShowTranslated] = useState(false);
    const [translating, setTranslating] = useState(false);

    const handleTranslate = async () => {
        if (showTranslated) {
            setShowTranslated(false);
            return;
        }
        if (translatedText) {
            setShowTranslated(true);
            return;
        }
        setTranslating(true);
        try {
            const result = await translateText(msg._id, 'hub_message', msg.message, targetLang);
            if (result.translatedText) {
                setTranslatedText(result.translatedText);
                setShowTranslated(true);
            }
        } catch (error) {
            console.error('Translation failed', error);
        } finally {
            setTranslating(false);
        }
    };

    return (
        <div style={{ marginBottom: '15px' }}>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span><strong>{msg.senderUsername}</strong> · {new Date(msg.createdAt).toLocaleTimeString()}</span>
                <button
                    onClick={handleTranslate}
                    disabled={translating}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.6
                    }}
                    title="Translate message"
                >
                    <DualArrowIcon size={14} color={showTranslated ? '#4facfe' : '#666'} />
                </button>
            </div>
            <div style={{ fontSize: '15px' }}>
                {translating ? <span style={{ color: '#aaa' }}>Translating...</span> : (showTranslated ? translatedText : msg.message)}
            </div>
        </div>
    );
}

export default function HubDetail({ hubId, onBack, onReadStory, user }) {
    const [hub, setHub] = useState(null);
    const [members, setMembers] = useState([]);
    const [stories, setStories] = useState([]);
    const [chat, setChat] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('stories'); // 'stories', 'members', 'chat', 'requests'
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [inviteUsername, setInviteUsername] = useState('');
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [storyTitle, setStoryTitle] = useState('');
    const [storyText, setStoryText] = useState('');
    const [showStoryForm, setShowStoryForm] = useState(false);
    const [targetLang, setTargetLang] = useState('en');
    const chatEndRef = useRef(null);

    const isMember = hub?.isMember;
    const isModerator = hub?.isModerator;

    useEffect(() => {
        loadHubData();

        const loadPrefs = () => {
            fetchUserPreferences().then(res => {
                if (res.preferences?.preferredLanguage) {
                    setTargetLang(res.preferences.preferredLanguage);
                }
            }).catch(() => { });
        };

        loadPrefs();

        // Listen for preference updates from Settings page
        const handlePreferencesUpdate = (event) => {
            if (event.detail?.preferences?.preferredLanguage) {
                setTargetLang(event.detail.preferences.preferredLanguage);
            }
        };

        window.addEventListener('preferencesUpdated', handlePreferencesUpdate);
        return () => window.removeEventListener('preferencesUpdated', handlePreferencesUpdate);
    }, [hubId]);

    useEffect(() => {
        if (activeTab === 'chat' && isMember) {
            loadChat();
            const interval = setInterval(loadChat, 5000); // Poll every 5s
            return () => clearInterval(interval);
        } else if (activeTab === 'members') {
            loadMembers();
        } else if (activeTab === 'stories') {
            loadStories();
        } else if (activeTab === 'requests' && isModerator) {
            loadPendingRequests();
        }
    }, [activeTab, isMember]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chat]);

    const loadHubData = async () => {
        setLoading(true);
        try {
            const result = await fetchHubDetails(hubId);
            setHub(result.hub);
            setMembers(result.members || []);
            setStories(result.stories || []);
        } catch (error) {
            console.error('Failed to load hub:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMembers = async () => {
        try {
            const result = await fetchHubMembers(hubId);
            setMembers(result.members || []);
        } catch (error) {
            console.error('Failed to load members:', error);
        }
    };

    const loadStories = async () => {
        try {
            const result = await fetchHubStories(hubId);
            setStories(result.stories || []);
        } catch (error) {
            console.error('Failed to load stories:', error);
        }
    };

    const loadChat = async () => {
        try {
            const result = await fetchHubChat(hubId, 50);
            setChat(result.messages || []);
        } catch (error) {
            console.error('Failed to load chat:', error);
        }
    };

    const loadPendingRequests = async () => {
        try {
            const result = await fetchPendingRequests(hubId);
            setPendingRequests(result.requests || []);
        } catch (error) {
            console.error('Failed to load requests:', error);
        }
    };

    const handleJoinHub = async () => {
        try {
            await requestJoinHub(hubId);
            alert('Join request sent!');
            loadHubData();
        } catch (error) {
            alert('Failed to send join request');
        }
    };

    const handleLeaveHub = async () => {
        if (!confirm('Are you sure you want to leave this hub?')) return;
        try {
            await leaveHub(hubId);
            alert('Left hub successfully');
            onBack();
        } catch (error) {
            alert('Failed to leave hub');
        }
    };

    const handleSendInvite = async (e) => {
        e.preventDefault();
        try {
            await sendHubInvite(hubId, inviteUsername);
            alert(`Invite sent to ${inviteUsername}!`);
            setInviteUsername('');
            setShowInviteForm(false);
        } catch (error) {
            alert('Failed to send invite');
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        try {
            await postHubChatMessage(hubId, message);
            setMessage('');
            loadChat();
        } catch (error) {
            alert('Failed to send message');
        }
    };

    const handleRemoveMember = async (userInternalId) => {
        if (!confirm('Remove this member?')) return;
        try {
            await removeHubMember(hubId, userInternalId);
            loadMembers();
        } catch (error) {
            alert('Failed to remove member');
        }
    };

    const handleUpdateRole = async (userInternalId, newRole) => {
        try {
            await updateMemberRole(hubId, userInternalId, newRole);
            loadMembers();
        } catch (error) {
            alert('Failed to update role');
        }
    };

    const handleApproveRequest = async (requestId, approve) => {
        try {
            await approveJoinRequest(hubId, requestId, approve);
            loadPendingRequests();
            loadMembers();
        } catch (error) {
            alert('Failed to process request');
        }
    };

    const handleCreateStory = async (e) => {
        e.preventDefault();
        if (!storyText.trim()) return;
        try {
            await createHubStory(hubId, storyTitle, storyText);
            alert('Story created!');
            setStoryTitle('');
            setStoryText('');
            setShowStoryForm(false);
            loadStories();
        } catch (error) {
            alert('Failed to create story');
        }
    };

    if (loading) {
        return (
            <div style={{
                fontFamily: 'Georgia, serif',
                background: '#fefefd',
                minHeight: '100vh',
                padding: '20px',
                textAlign: 'center',
            }}>
                Loading...
            </div>
        );
    }

    if (!hub) {
        return (
            <div style={{
                fontFamily: 'Georgia, serif',
                background: '#fefefd',
                minHeight: '100vh',
                padding: '20px',
            }}>
                <button onClick={onBack} style={{ marginBottom: '20px' }}>← Back</button>
                <p>Hub not found</p>
            </div>
        );
    }

    return (
        <div style={{
            fontFamily: 'Georgia, serif',
            background: '#fefefd',
            minHeight: '100vh',
        }}>
            {/* Header */}
            <div style={{
                borderBottom: '1px solid #e0e0e0',
                background: '#fff',
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
                            <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '16px', lineHeight: '1.6' }}>
                                {hub.description}
                            </p>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{
                                    padding: '5px 12px',
                                    background: '#f0f0f0',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                }}>
                                    {hub.theme}
                                </span>
                                {hub.tags?.map((tag, idx) => (
                                    <span key={idx} style={{
                                        padding: '5px 12px',
                                        background: '#e8f4f8',
                                        borderRadius: '12px',
                                        fontSize: '13px',
                                        color: '#0066cc',
                                    }}>
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            {!isMember ? (
                                <button
                                    onClick={handleJoinHub}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#3d5a80',
                                        color: '#fff',
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
                                    onClick={handleLeaveHub}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#666',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '15px',
                                    }}
                                >
                                    Leave Hub
                                </button>
                            )}
                            <div style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                                {hub.memberCount} members · {hub.totalStories} stories
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                background: '#fff',
                borderBottom: '1px solid #e0e0e0',
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
                            onClick={() => setActiveTab(tab)}
                            style={{
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === tab ? '2px solid #333' : '2px solid transparent',
                                padding: '15px 0',
                                cursor: 'pointer',
                                fontSize: '15px',
                                textTransform: 'capitalize',
                                color: activeTab === tab ? '#333' : '#666',
                                fontWeight: activeTab === tab ? '600' : '400',
                            }}
                        >
                            {tab}
                            {tab === 'requests' && pendingRequests.length > 0 && (
                                <span style={{
                                    marginLeft: '6px',
                                    background: '#c7968c',
                                    color: '#fff',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                }}>
                                    {pendingRequests.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
                {/* Stories Tab */}
                {activeTab === 'stories' && (
                    <div>
                        {isMember && (
                            <button
                                onClick={() => setShowStoryForm(!showStoryForm)}
                                style={{
                                    marginBottom: '20px',
                                    padding: '10px 20px',
                                    background: '#3d5a80',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '15px',
                                }}
                            >
                                {showStoryForm ? 'Cancel' : '+ New Story'}
                            </button>
                        )}

                        {showStoryForm && (
                            <form onSubmit={handleCreateStory} style={{
                                marginBottom: '30px',
                                padding: '20px',
                                background: '#fff',
                                border: '1px solid #e0e0e0',
                                borderRadius: '4px',
                            }}>
                                <input
                                    type="text"
                                    placeholder="Story title (optional)"
                                    value={storyTitle}
                                    onChange={(e) => setStoryTitle(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        marginBottom: '10px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '15px',
                                        fontFamily: 'Georgia, serif',
                                    }}
                                />
                                <textarea
                                    placeholder="Write your story..."
                                    value={storyText}
                                    onChange={(e) => setStoryText(e.target.value)}
                                    rows={8}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '15px',
                                        fontFamily: 'Georgia, serif',
                                        resize: 'vertical',
                                    }}
                                />
                                <div style={{ marginTop: '10px', fontSize: '13px', color: '#666' }}>
                                    {storyText.split(/\s+/).filter(w => w).length} words
                                </div>
                                <button
                                    type="submit"
                                    style={{
                                        marginTop: '10px',
                                        padding: '10px 20px',
                                        background: '#3d5a80',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Publish
                                </button>
                            </form>
                        )}

                        {stories.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                No stories yet. {isMember && 'Be the first to write!'}
                            </div>
                        ) : (
                            stories.map((story) => (
                                <div
                                    key={story._id}
                                    onClick={() => onReadStory(story)}
                                    style={{
                                        padding: '20px',
                                        background: '#fff',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '4px',
                                        marginBottom: '15px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {story.title && (
                                        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>{story.title}</h3>
                                    )}
                                    <p style={{ margin: '0 0 10px 0', color: '#333', lineHeight: '1.6' }}>
                                        {story.text?.substring(0, 200)}...
                                    </p>
                                    <div style={{ fontSize: '13px', color: '#666' }}>
                                        by {story.authorUsername} · {story.likes} likes
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Members Tab */}
                {activeTab === 'members' && (
                    <div>
                        {isModerator && (
                            <button
                                onClick={() => setShowInviteForm(!showInviteForm)}
                                style={{
                                    marginBottom: '20px',
                                    padding: '10px 20px',
                                    background: '#3d5a80',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }}
                            >
                                {showInviteForm ? 'Cancel' : '+ Invite Member'}
                            </button>
                        )}

                        {showInviteForm && (
                            <form onSubmit={handleSendInvite} style={{
                                marginBottom: '20px',
                                display: 'flex',
                                gap: '10px',
                            }}>
                                <input
                                    type="text"
                                    placeholder="Enter username"
                                    value={inviteUsername}
                                    onChange={(e) => setInviteUsername(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '15px',
                                        fontFamily: 'Georgia, serif',
                                    }}
                                />
                                <button type="submit" style={{
                                    padding: '10px 20px',
                                    background: '#3d5a80',
                                    color: '#fff',
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
                                    background: '#fff',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '15px' }}>
                                            {member.username}
                                            {member.role === 'creator' && (
                                                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#0066cc' }}>
                                                    👑 Creator
                                                </span>
                                            )}
                                            {member.role === 'moderator' && (
                                                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#3d5a80' }}>
                                                    ⭐ Moderator
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                                            {member.contributionCount} contributions
                                        </div>
                                    </div>
                                    {isModerator && member.role !== 'creator' && (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            {member.role === 'member' && (
                                                <button
                                                    onClick={() => handleUpdateRole(member.userInternalId, 'moderator')}
                                                    style={{
                                                        padding: '6px 12px',
                                                        background: '#e8f4f8',
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
                                                onClick={() => handleRemoveMember(member.userInternalId)}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: '#ffe0e0',
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
                )}

                {/* Chat Tab */}
                {activeTab === 'chat' && isMember && (
                    <div>
                        <div style={{
                            background: '#fff',
                            border: '1px solid #e0e0e0',
                            borderRadius: '4px',
                            height: '500px',
                            display: 'flex',
                            flexDirection: 'column',
                        }}>
                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '20px',
                            }}>
                                {chat.map((msg) => (
                                    <ChatMessage key={msg._id} msg={msg} targetLang={targetLang} />
                                ))}
                                <div ref={chatEndRef} />
                            </div>
                            <form onSubmit={handleSendMessage} style={{
                                borderTop: '1px solid #e0e0e0',
                                padding: '15px',
                                display: 'flex',
                                gap: '10px',
                            }}>
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '15px',
                                        fontFamily: 'Georgia, serif',
                                    }}
                                />
                                <button type="submit" style={{
                                    padding: '10px 20px',
                                    background: '#3d5a80',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }}>
                                    Send
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Requests Tab */}
                {activeTab === 'requests' && isModerator && (
                    <div>
                        {pendingRequests.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                No pending requests
                            </div>
                        ) : (
                            pendingRequests.map((request) => (
                                <div key={request._id} style={{
                                    padding: '15px',
                                    background: '#fff',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '4px',
                                    marginBottom: '10px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: '600' }}>{request.username}</div>
                                        <div style={{ fontSize: '13px', color: '#666' }}>
                                            {new Date(request.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => handleApproveRequest(request._id, true)}
                                            style={{
                                                padding: '8px 16px',
                                                background: '#3d5a80',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleApproveRequest(request._id, false)}
                                            style={{
                                                padding: '8px 16px',
                                                background: '#666',
                                                color: '#fff',
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
                )}
            </div>
        </div>
    );
}
