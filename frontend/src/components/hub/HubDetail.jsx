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
    fetchUserPreferences,
    markHubSeen
} from '../../api/api';
import {
    SkeletonHubDetail,
    SkeletonHubStories,
    SkeletonHubMembers,
    SkeletonHubChat,
    SkeletonHubRequests,
    SkeletonRegion,
} from '../skeletons';
import useMinLoadTime from '../../hooks/useMinLoadTime';
import useRegionLoading from '../../hooks/useRegionLoading';
import useToast from '../../hooks/useToast';
import ConfirmDialog from '../common/ConfirmDialog';
import HubHeader from './HubHeader';
import HubTabs from './HubTabs';
import HubStoriesTab from './HubStoriesTab';
import HubMembersTab from './HubMembersTab';
import HubChatTab from './HubChatTab';
import HubRequestsTab from './HubRequestsTab';

function assertOk(result, fallback) {
    if (!result?.success) throw new Error(result?.error || fallback);
    return result;
}

export default function HubDetail({ hubId, onBack, onReadStory, user }) {
    const [hub, setHub] = useState(null);
    const [members, setMembers] = useState([]);
    const [stories, setStories] = useState([]);
    const [chat, setChat] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('stories'); // 'stories', 'members', 'chat', 'requests'
    const [loading, setLoading] = useState(true);
    const [tabBusy, setTabBusy] = useState(false);
    const showSkeleton = useMinLoadTime(loading);
    const tabLoading = useRegionLoading(tabBusy);
    const skipFirstStoriesFetch = useRef(true);
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
    const [creatingStory, setCreatingStory] = useState(false);
    const [inviting, setInviting] = useState(false);
    const [actingRequestId, setActingRequestId] = useState(null);
    const [actingMemberId, setActingMemberId] = useState(null);
    const [joining, setJoining] = useState(false);
    const [targetLang, setTargetLang] = useState('en');
    const chatEndRef = useRef(null);

    const isMember = hub?.isMember;
    const isModerator = hub?.isModerator;
    const isCreator = !!(hub?.isCreator || (user?.internalId && hub?.creatorInternalId === user.internalId));
    const canLeave = !!(isMember && user?.internalId && hub?.creatorInternalId !== user.internalId);

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
        skipFirstStoriesFetch.current = true;
    }, [hubId]);

    useEffect(() => {
        if (!hub) return undefined;
        let cancelled = false;

        const run = async (fn, { silent = false } = {}) => {
            if (!silent) setTabBusy(true);
            try {
                await fn();
            } finally {
                if (!cancelled && !silent) setTabBusy(false);
            }
        };

        if (activeTab === 'stories') {
            if (skipFirstStoriesFetch.current) {
                skipFirstStoriesFetch.current = false;
                return undefined;
            }
            run(loadStories);
            return () => { cancelled = true; };
        }
        if (activeTab === 'members') {
            run(loadMembers);
            return () => { cancelled = true; };
        }
        if (activeTab === 'chat' && isMember) {
            setHub((prev) => (prev && prev.unreadChat ? { ...prev, unreadChat: false } : prev));
            run(loadChat);
            const interval = setInterval(() => { loadChat(); }, 5000);
            return () => {
                cancelled = true;
                clearInterval(interval);
            };
        }
        if (activeTab === 'requests' && isModerator) {
            run(loadPendingRequests);
            return () => { cancelled = true; };
        }
        return undefined;
    }, [activeTab, isMember, isModerator, hub]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chat]);

    const applyHubPayload = (result) => {
        if (!result?.hub) {
            setHub(null);
            return;
        }
        setHub(result.hub);
        setMembers(result.members || []);
        setStories(result.stories || []);
        if (result.hub.isModerator) {
            fetchPendingRequests(hubId)
                .then((reqResult) => setPendingRequests(reqResult.requests || []))
                .catch(() => {});
        }
        if (result.hub.isMember) {
            markHubSeen(hubId).catch(() => {});
        }
    };

    const loadHubData = async () => {
        setLoading(true);
        try {
            const result = await fetchHubDetails(hubId);
            if (result && result.success === false) {
                setHub(null);
                return;
            }
            applyHubPayload(result);
        } catch (error) {
            console.error('Failed to load hub:', error);
            setHub(null);
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
        if (joining) return;
        setJoining(true);
        try {
            const result = await requestJoinHub(hubId);
            if (!result?.success) {
                throw new Error(result?.error || 'Failed to send join request');
            }
            toast.success(result.message || 'Join request sent');
            const fresh = await fetchHubDetails(hubId);
            applyHubPayload(fresh);
        } catch (error) {
            toast.error(error.message || 'Failed to send join request');
        } finally {
            setJoining(false);
        }
    };

    const confirmLeaveHub = async () => {
        setLeaving(true);
        try {
            assertOk(await leaveHub(hubId), 'Failed to leave hub');
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
        if (inviting) return;
        setInviting(true);
        try {
            assertOk(await sendHubInvite(hubId, inviteUsername), 'Failed to send invite');
            toast.success(`Invite sent to ${inviteUsername}`);
            setInviteUsername('');
            setShowInviteForm(false);
        } catch (error) {
            toast.error('Failed to send invite');
        } finally {
            setInviting(false);
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
            assertOk(await postHubChatMessage(hubId, text), 'Failed to send message');
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
            assertOk(await removeHubMember(hubId, memberToRemove), 'Failed to remove member');
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
        if (actingMemberId) return;
        setActingMemberId(userInternalId);
        try {
            assertOk(await updateMemberRole(hubId, userInternalId, newRole), 'Failed to update role');
            toast.success(newRole === 'moderator' ? 'Promoted to moderator' : 'Returned to member');
            loadMembers();
        } catch (error) {
            toast.error(error.message || 'Failed to update role');
        } finally {
            setActingMemberId(null);
        }
    };

    const handleApproveRequest = async (requestId, approve) => {
        if (actingRequestId) return;
        setActingRequestId(requestId);
        try {
            assertOk(await approveJoinRequest(hubId, requestId, approve), 'Failed to process request');
            toast.success(approve ? 'Request approved' : 'Request rejected');
            loadPendingRequests();
            loadMembers();
        } catch (error) {
            toast.error('Failed to process request');
        } finally {
            setActingRequestId(null);
        }
    };

    const handleCreateStory = async (e) => {
        e.preventDefault();
        if (!storyText.trim() || creatingStory) return;
        setCreatingStory(true);
        try {
            const result = assertOk(await createHubStory(hubId, storyTitle, storyText), 'Failed to create story');
            toast.success(result.message || 'Story created');
            setStoryTitle('');
            setStoryText('');
            setShowStoryForm(false);
            loadStories();
        } catch (error) {
            toast.error('Failed to create story');
        } finally {
            setCreatingStory(false);
        }
    };

    const tabSkeleton =
        activeTab === 'members' ? <SkeletonHubMembers /> :
        activeTab === 'chat' ? <SkeletonHubChat /> :
        activeTab === 'requests' ? <SkeletonHubRequests /> :
        <SkeletonHubStories />;

    if (showSkeleton) {
        return <SkeletonHubDetail />;
    }

    if (!hub) {
        return (
            <div className="page-shell">
                <div className="page-shell__inner page-shell__inner--page hub-room">
                    <button type="button" onClick={onBack} className="btn-back">← Back to Hubs</button>
                    <div className="hubs-empty">
                        <p className="hubs-empty__title">Hub not found</p>
                        <p className="hubs-empty__copy">It may be private, archived, or the link is wrong.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-shell">
            <div className="page-shell__inner page-shell__inner--page hub-room">
            <HubHeader
                hub={hub}
                isMember={isMember}
                canLeave={canLeave}
                joining={joining}
                onBack={onBack}
                onJoin={handleJoinHub}
                onLeaveClick={() => setConfirmLeave(true)}
            />

            <HubTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isMember={isMember}
                isModerator={isModerator}
                chatEnabled={hub.chatEnabled !== false}
                pendingRequestCount={pendingRequests.length}
                unreadChat={!!hub.unreadChat}
            />

                <SkeletonRegion loading={tabLoading} minHeight={360} skeleton={tabSkeleton}>
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
                            creating={creatingStory}
                            stories={stories}
                            onReadStory={onReadStory}
                        />
                    )}

                    {activeTab === 'members' && (
                        <HubMembersTab
                            isModerator={isModerator}
                            isCreator={isCreator}
                            actingMemberId={actingMemberId}
                            showInviteForm={showInviteForm}
                            onToggleInviteForm={() => setShowInviteForm(!showInviteForm)}
                            inviteUsername={inviteUsername}
                            onInviteUsernameChange={(e) => setInviteUsername(e.target.value)}
                            onSendInvite={handleSendInvite}
                            inviting={inviting}
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
                            actingRequestId={actingRequestId}
                            onApproveRequest={handleApproveRequest}
                        />
                    )}
                </SkeletonRegion>
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
