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
    fetchPendingRequests,
    approveJoinRequest,
    createHubStory,
    fetchUserPreferences
} from '../api/api';
import { SkeletonHubDetail } from './SkeletonLoader';
import useMinLoadTime from '../hooks/useMinLoadTime';
import useToast from '../hooks/useToast';
import ConfirmDialog from './ConfirmDialog';
import HubHeader from './hub/HubHeader';
import HubTabs from './hub/HubTabs';
import HubStoriesTab from './hub/HubStoriesTab';
import HubMembersTab from './hub/HubMembersTab';
import HubChatTab from './hub/HubChatTab';
import HubRequestsTab from './hub/HubRequestsTab';

export default function HubDetail({ hubId, onBack, onReadStory, user }) {
    const [hub, setHub] = useState(null);
    const [members, setMembers] = useState([]);
    const [stories, setStories] = useState([]);
    const [chat, setChat] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('stories'); // 'stories', 'members', 'chat', 'requests'
    const [loading, setLoading] = useState(true);
    const showSkeleton = useMinLoadTime(loading);
    const toast = useToast();
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState(null);
    const [leaving, setLeaving] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [sendingChat, setSendingChat] = useState(false);
    const sendingChatRef = useRef(false);
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
            toast.success('Join request sent');
            const result = await fetchHubDetails(hubId);
            setHub(result.hub);
            setMembers(result.members || []);
            setStories(result.stories || []);
        } catch (error) {
            toast.error('Failed to send join request');
        }
    };

    const confirmLeaveHub = async () => {
        setLeaving(true);
        try {
            await leaveHub(hubId);
            toast.success('Left hub');
            setConfirmLeave(false);
            onBack();
        } catch (error) {
            toast.error('Failed to leave hub');
        } finally {
            setLeaving(false);
        }
    };

    const handleSendInvite = async (e) => {
        e.preventDefault();
        try {
            await sendHubInvite(hubId, inviteUsername);
            toast.success(`Invite sent to ${inviteUsername}`);
            setInviteUsername('');
            setShowInviteForm(false);
        } catch (error) {
            toast.error('Failed to send invite');
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim() || sendingChatRef.current) return;
        sendingChatRef.current = true;
        setSendingChat(true);
        const text = message;
        const optimisticId = `opt-${Date.now()}`;
        setChat(prev => [...prev, {
            _id: optimisticId,
            senderUsername: user?.username || 'You',
            message: text,
            createdAt: new Date().toISOString(),
        }]);
        setMessage('');
        try {
            await postHubChatMessage(hubId, text);
            toast.success('Message sent');
            loadChat();
        } catch (error) {
            setChat(prev => prev.filter(m => m._id !== optimisticId));
            toast.error('Failed to send message');
        } finally {
            sendingChatRef.current = false;
            setSendingChat(false);
        }
    };

    const confirmRemoveMember = async () => {
        if (!memberToRemove) return;
        setRemoving(true);
        try {
            await removeHubMember(hubId, memberToRemove);
            toast.success('Member removed');
            setMemberToRemove(null);
            loadMembers();
        } catch (error) {
            toast.error('Failed to remove member');
        } finally {
            setRemoving(false);
        }
    };

    const handleUpdateRole = async (userInternalId, newRole) => {
        try {
            await updateMemberRole(hubId, userInternalId, newRole);
            toast.success('Role updated');
            loadMembers();
        } catch (error) {
            toast.error('Failed to update role');
        }
    };

    const handleApproveRequest = async (requestId, approve) => {
        try {
            await approveJoinRequest(hubId, requestId, approve);
            toast.success(approve ? 'Request approved' : 'Request rejected');
            loadPendingRequests();
            loadMembers();
        } catch (error) {
            toast.error('Failed to process request');
        }
    };

    const handleCreateStory = async (e) => {
        e.preventDefault();
        if (!storyText.trim()) return;
        try {
            await createHubStory(hubId, storyTitle, storyText);
            toast.success('Story created');
            setStoryTitle('');
            setStoryText('');
            setShowStoryForm(false);
            loadStories();
        } catch (error) {
            toast.error('Failed to create story');
        }
    };

    if (showSkeleton) {
        return <SkeletonHubDetail />;
    }

    if (!hub) {
        return (
            <div style={{
                fontFamily: 'var(--font-serif)',
                background: 'transparent',
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
fontFamily: 'var(--font-serif)',
                background: 'transparent',
            minHeight: '100vh',
        }}>
            <HubHeader
                hub={hub}
                isMember={isMember}
                onBack={onBack}
                onJoin={handleJoinHub}
                onLeaveClick={() => setConfirmLeave(true)}
            />

            <HubTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isMember={isMember}
                isModerator={isModerator}
                pendingRequestCount={pendingRequests.length}
            />

            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
                {activeTab === 'stories' && (
                    <HubStoriesTab
                        isMember={isMember}
                        showStoryForm={showStoryForm}
                        onToggleStoryForm={() => setShowStoryForm(!showStoryForm)}
                        storyTitle={storyTitle}
                        storyText={storyText}
                        onStoryTitleChange={(e) => setStoryTitle(e.target.value)}
                        onStoryTextChange={(e) => setStoryText(e.target.value)}
                        onCreateStory={handleCreateStory}
                        stories={stories}
                        onReadStory={onReadStory}
                    />
                )}

                {activeTab === 'members' && (
                    <HubMembersTab
                        isModerator={isModerator}
                        showInviteForm={showInviteForm}
                        onToggleInviteForm={() => setShowInviteForm(!showInviteForm)}
                        inviteUsername={inviteUsername}
                        onInviteUsernameChange={(e) => setInviteUsername(e.target.value)}
                        onSendInvite={handleSendInvite}
                        members={members}
                        onUpdateRole={handleUpdateRole}
                        onRemoveMember={setMemberToRemove}
                    />
                )}

                {activeTab === 'chat' && isMember && (
                    <HubChatTab
                        chat={chat}
                        targetLang={targetLang}
                        chatEndRef={chatEndRef}
                        message={message}
                        onMessageChange={(e) => setMessage(e.target.value)}
                        onSendMessage={handleSendMessage}
                        sendingChat={sendingChat}
                    />
                )}

                {activeTab === 'requests' && isModerator && (
                    <HubRequestsTab
                        pendingRequests={pendingRequests}
                        onApproveRequest={handleApproveRequest}
                    />
                )}
            </div>

            <ConfirmDialog
                open={confirmLeave}
                title="Leave this hub?"
                message="You will need to request to join again."
                confirmLabel="Leave hub"
                destructive
                busy={leaving}
                onConfirm={confirmLeaveHub}
                onCancel={() => { if (!leaving) setConfirmLeave(false); }}
            />
            <ConfirmDialog
                open={!!memberToRemove}
                title="Remove this member?"
                message="They will lose access to hub stories and chat."
                confirmLabel="Remove"
                destructive
                busy={removing}
                onConfirm={confirmRemoveMember}
                onCancel={() => { if (!removing) setMemberToRemove(null); }}
            />
        </div>
    );
}
