import React, { useState, useEffect, useRef } from 'react';
import {
    fetchHubs,
    fetchMyHubs,
    fetchHubInvites,
    checkHubEligibility,
    respondToInvite,
} from '../../api/api';
import { SkeletonHubsPage, SkeletonHubsGrid, SkeletonRegion } from '../skeletons';
import useMinLoadTime from '../../hooks/useMinLoadTime';
import useRegionLoading from '../../hooks/useRegionLoading';
import useToast from '../../hooks/useToast';
import { themeLabel } from './hubLabels';

const TABS = [
    { id: 'discover', label: 'Discover' },
    { id: 'my-hubs', label: 'My Hubs' },
    { id: 'invites', label: 'Invites' },
];

const LEDES = {
    discover: 'Find a writing room to join.',
    'my-hubs': 'Rooms you already write in.',
    invites: 'Invitations waiting for you.',
};

function roleLabel(role) {
    if (role === 'creator') return 'Creator';
    if (role === 'moderator') return 'Moderator';
    return 'Member';
}

function timeAgo(date) {
    if (!date) return null;
    const posted = new Date(date);
    if (Number.isNaN(posted.getTime())) return null;
    const diffMs = Date.now() - posted.getTime();
    if (diffMs < 0) return null;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 30) return `${Math.floor(diffDays / 30)}mo ago`;
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
}

function HubCard({ hub, onClick }) {
    const members = Number(hub.memberCount) || 0;
    const stories = Number(hub.totalStories) || 0;
    const activity = timeAgo(hub.lastActivityAt);
    const mark = (hub.name || '?').trim().charAt(0).toUpperCase() || '?';
    const tags = Array.isArray(hub.tags) ? hub.tags.slice(0, 3) : [];
    const description = (hub.description || '').trim();

    return (
        <button type="button" className="hub-card" onClick={onClick}>
            <div className="hub-card__top">
                <span className="hub-card__mark" aria-hidden="true">{mark}</span>
                {hub.role && hub.role !== 'member' && (
                    <span className={`hub-card__role hub-card__role--${hub.role}`}>
                        {roleLabel(hub.role)}
                    </span>
                )}
            </div>
            <h3 className="hub-card__name">{hub.name}</h3>
            <p className={`hub-card__desc${description ? '' : ' hub-card__desc--empty'}`}>
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
            <div className="hub-card__meta">
                <span>{members} {members === 1 ? 'member' : 'members'}</span>
                <span>{stories} {stories === 1 ? 'story' : 'stories'}</span>
                {activity && <span>{activity === 'Just now' ? 'Active just now' : `Active ${activity}`}</span>}
            </div>
            {(hub.pendingRequestCount > 0 || hub.unreadChat) && (
                <div className="hub-card__cues">
                    {hub.pendingRequestCount > 0 && (
                        <span className="hub-card__cue">
                            {hub.pendingRequestCount} {hub.pendingRequestCount === 1 ? 'request' : 'requests'}
                        </span>
                    )}
                    {hub.unreadChat && <span className="hub-card__cue hub-card__cue--chat">New chat</span>}
                </div>
            )}
        </button>
    );
}

export default function CollaborativeHubs({ onBack, onHubClick, onCreateHub }) {
    const toast = useToast();
    const [hubs, setHubs] = useState([]);
    const [myHubs, setMyHubs] = useState([]);
    const [invites, setInvites] = useState([]);
    const [view, setView] = useState('discover');
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [rawLoading, setRawLoading] = useState(true);
    const [regionBusy, setRegionBusy] = useState(false);
    const showT0 = useMinLoadTime(rawLoading && isFirstLoad);
    const regionLoading = useRegionLoading(regionBusy && !isFirstLoad);
    const [filter, setFilter] = useState({ visibility: '', theme: '' });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [canCreate, setCanCreate] = useState(false);
    const [error, setError] = useState('');
    const [actingInviteId, setActingInviteId] = useState(null);
    const [entered, setEntered] = useState(false);
    const [paging, setPaging] = useState(false);
    const pagingLock = useRef(false);

    useEffect(() => {
        checkHubEligibility()
            .then((result) => setCanCreate(!!result.eligible))
            .catch(() => setCanCreate(false));
        fetchHubInvites()
            .then((result) => setInvites(result.invites || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            const appending = view === 'discover' && page > 1;
            if (isFirstLoad) setRawLoading(true);
            else if (appending) setPaging(true);
            else setRegionBusy(true);
            setError('');
            try {
                if (view === 'discover') {
                    const result = await fetchHubs(filter.visibility, filter.theme, page, 20);
                    if (cancelled) return;
                    if (result && result.success === false) {
                        throw new Error(result.error || 'Failed to load hubs');
                    }
                    const next = result.hubs || [];
                    setHubs(page > 1 ? (prev) => [...prev, ...next] : next);
                    setHasMore(result.pagination?.currentPage < result.pagination?.totalPages);
                } else if (view === 'my-hubs') {
                    const result = await fetchMyHubs();
                    if (cancelled) return;
                    if (result && result.success === false) {
                        throw new Error(result.error || 'Failed to load your hubs');
                    }
                    setMyHubs(result.hubs || []);
                } else if (view === 'invites') {
                    const result = await fetchHubInvites();
                    if (cancelled) return;
                    if (result && result.success === false) {
                        throw new Error(result.error || 'Failed to load invites');
                    }
                    setInvites(result.invites || []);
                }
            } catch (err) {
                if (cancelled) return;
                console.error('Failed to load hubs:', err);
                setError('Could not load this view. Try again in a moment.');
            } finally {
                if (!cancelled) {
                    setRawLoading(false);
                    setRegionBusy(false);
                    setPaging(false);
                    setIsFirstLoad(false);
                    pagingLock.current = false;
                }
            }
        };

        load();
        return () => {
            cancelled = true;
            pagingLock.current = false;
        };
        // isFirstLoad is intentional: first paint uses T0, later tab/filter uses T1
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, filter.theme, filter.visibility, page]);

    useEffect(() => {
        if (regionLoading || showT0) {
            setEntered(false);
            return undefined;
        }
        const id = requestAnimationFrame(() => setEntered(true));
        return () => cancelAnimationFrame(id);
    }, [regionLoading, showT0, view, hubs, myHubs]);

    const handleTab = (tab) => {
        if (tab === view) return;
        setView(tab);
        setPage(1);
    };

    const handleRespond = async (invite, accept) => {
        const id = invite._id;
        setActingInviteId(id);
        try {
            const result = await respondToInvite(id, accept);
            if (!result?.success) {
                throw new Error(result?.error || 'Failed to respond');
            }
            setInvites((prev) => prev.filter((item) => item._id !== id));
            toast.success(accept ? `You joined ${invite.hub?.name || 'the hub'}` : 'Invite declined');
            if (accept && invite.hub?.hubId) onHubClick(invite.hub.hubId);
        } catch (err) {
            console.error('Invite respond error:', err);
            toast.error('Could not respond to that invite.');
        } finally {
            setActingInviteId(null);
        }
    };

    const themes = [
        { value: '', label: 'All themes' },
        { value: 'general', label: 'General' },
        { value: 'scifi', label: 'Sci-Fi' },
        { value: 'fantasy', label: 'Fantasy' },
        { value: 'poetry', label: 'Poetry' },
        { value: 'mystery', label: 'Mystery' },
        { value: 'horror', label: 'Horror' },
        { value: 'romance', label: 'Romance' },
        { value: 'nonfiction', label: 'Non-Fiction' },
    ];

    if (showT0) {
        return <SkeletonHubsPage />;
    }

    const gridClass = `hubs-grid${entered ? ' hubs-grid--entering' : ''}`;
    const myHubAttention = myHubs.reduce(
        (n, h) => n + (Number(h.pendingRequestCount) || 0) + (h.unreadChat ? 1 : 0),
        0
    );

    return (
        <div className="page-shell">
            <div className="page-shell__inner page-shell__inner--wide hubs-page">
                <button type="button" onClick={onBack} className="btn-back">← Back</button>

                <header className="hubs-page__intro">
                    <div className="hubs-page__titles">
                        <h1 className="page-title">Hubs</h1>
                        <p className="page-sub">{LEDES[view]}</p>
                    </div>
                    {canCreate && (
                        <button type="button" className="btn btn--primary hubs-page__create" onClick={onCreateHub}>
                            Create hub
                        </button>
                    )}
                </header>

                <div className="hubs-tabs" aria-label="Hub views">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            aria-pressed={view === tab.id}
                            className={`hubs-tab${view === tab.id ? ' hubs-tab--active' : ''}`}
                            onClick={() => handleTab(tab.id)}
                        >
                            {tab.label}
                            {tab.id === 'my-hubs' && myHubAttention > 0 && (
                                <span className="hubs-tab__count">{myHubAttention}</span>
                            )}
                            {tab.id === 'invites' && invites.length > 0 && (
                                <span className="hubs-tab__count">{invites.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {view === 'discover' && (
                    <div className="hubs-toolbar">
                        <select
                            id="hubs-theme-filter"
                            className="form-select"
                            aria-label="Filter hubs by theme"
                            value={filter.theme}
                            onChange={(e) => {
                                setFilter({ ...filter, theme: e.target.value });
                                setPage(1);
                            }}
                        >
                            {themes.map((theme) => (
                                <option key={theme.value} value={theme.value}>{theme.label}</option>
                            ))}
                        </select>
                    </div>
                )}

                {error && <div className="feed__error" role="alert">{error}</div>}

                <SkeletonRegion
                    loading={regionLoading}
                    minHeight={320}
                    skeleton={<SkeletonHubsGrid />}
                >
                    {view === 'discover' && (
                        hubs.length === 0 ? (
                            <div className="hubs-empty">
                                <p className="hubs-empty__title">No hubs match</p>
                                <p className="hubs-empty__copy">Try another theme, or create a room if you can.</p>
                            </div>
                        ) : (
                            <div className={gridClass}>
                                {hubs.map((hub) => (
                                    <HubCard
                                        key={hub.hubId}
                                        hub={hub}
                                        onClick={() => onHubClick(hub.hubId)}
                                    />
                                ))}
                                {hasMore && (
                                    <button
                                        type="button"
                                        className={`btn btn--secondary hubs-more${paging ? ' btn--loading' : ''}`}
                                        disabled={paging}
                                        onClick={() => {
                                            if (pagingLock.current) return;
                                            pagingLock.current = true;
                                            setPage((p) => p + 1);
                                        }}
                                    >
                                        {paging && <span className="spinner-ring" aria-hidden="true" />}
                                        {paging ? 'Loading…' : 'Load more'}
                                    </button>
                                )}
                            </div>
                        )
                    )}

                    {view === 'my-hubs' && (
                        myHubs.length === 0 ? (
                            <div className="hubs-empty">
                                <p className="hubs-empty__title">You haven’t joined a hub yet</p>
                                <p className="hubs-empty__copy">
                                    Discover a writing room to collaborate on stories, share ideas, and grow together.
                                </p>
                                <button type="button" className="btn btn--primary" onClick={() => handleTab('discover')}>
                                    Explore hubs
                                </button>
                            </div>
                        ) : (
                            <div className={gridClass}>
                                {myHubs.map((hub) => (
                                    <HubCard
                                        key={hub.hubId}
                                        hub={hub}
                                        onClick={() => onHubClick(hub.hubId)}
                                    />
                                ))}
                            </div>
                        )
                    )}

                    {view === 'invites' && (
                        invites.length === 0 ? (
                            <div className="hubs-empty">
                                <p className="hubs-empty__title">No pending invites</p>
                                <p className="hubs-empty__copy">When someone invites you to a hub, it will show up here.</p>
                            </div>
                        ) : (
                            <div className="hubs-invites">
                                {invites.map((invite) => {
                                    const acting = actingInviteId === invite._id;
                                    const hubId = invite.hub?.hubId;
                                    return (
                                        <article key={invite._id} className="hub-invite">
                                            <p className="hub-invite__kicker">
                                                {invite.inviterUsername
                                                    ? `${invite.inviterUsername} invited you to`
                                                    : 'You were invited to'}
                                            </p>
                                            <h3 className="hub-invite__name">{invite.hub?.name || 'A hub'}</h3>
                                            {invite.hub?.description && (
                                                <p className="hub-invite__desc">{invite.hub.description}</p>
                                            )}
                                            {invite.message && (
                                                <p className="hub-invite__message">{invite.message}</p>
                                            )}
                                            <p className="hub-invite__meta">
                                                {themeLabel(invite.hub?.theme)}
                                                {invite.invitedAt ? ` · ${new Date(invite.invitedAt).toLocaleDateString()}` : ''}
                                            </p>
                                            <div className="hub-invite__actions">
                                                {hubId && (
                                                    <button
                                                        type="button"
                                                        className="btn btn--secondary"
                                                        onClick={() => onHubClick(hubId)}
                                                    >
                                                        View hub
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className={`btn btn--primary${acting ? ' btn--loading' : ''}`}
                                                    disabled={acting}
                                                    onClick={() => handleRespond(invite, true)}
                                                >
                                                    {acting && <span className="spinner-ring" aria-hidden="true" />}
                                                    {acting ? 'Joining…' : 'Accept'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn--ghost"
                                                    disabled={acting}
                                                    onClick={() => handleRespond(invite, false)}
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )
                    )}
                </SkeletonRegion>
            </div>
        </div>
    );
}
