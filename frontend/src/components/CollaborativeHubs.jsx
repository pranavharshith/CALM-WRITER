import React, { useState, useEffect, useRef } from 'react';
import { fetchHubs, fetchMyHubs, fetchHubInvites, checkHubEligibility } from '../api/api';
import { SkeletonHubCard, SkeletonHubsPage } from './SkeletonLoader';
import useMinLoadTime from '../hooks/useMinLoadTime';

function HubCard({ hub, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                padding: '20px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: 'var(--glass-bg-strong)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--text-secondary)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
                        {hub.name}
                    </h3>
                    <p style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
                        {hub.description}
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{
                            padding: '4px 10px',
                            background: 'var(--bg-subtle)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                        }}>
                            {hub.theme}
                        </span>
                        {hub.tags?.slice(0, 3).map((tag, idx) => (
                            <span key={idx} style={{
                                padding: '4px 10px',
                                background: 'var(--blue-light)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '12px',
                                color: 'var(--accent)',
                            }}>
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: '100px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        {hub.memberCount} {hub.memberCount === 1 ? 'member' : 'members'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        {hub.totalStories} {hub.totalStories === 1 ? 'story' : 'stories'}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CollaborativeHubs({ onBack, onHubClick, onCreateHub }) {
    const [hubs, setHubs] = useState([]);
    const [myHubs, setMyHubs] = useState([]);
    const [invites, setInvites] = useState([]);
    const [view, setView] = useState('discover'); // 'discover', 'my-hubs', 'invites'
    const [rawLoading, setRawLoading] = useState(true);
    const loading = useMinLoadTime(rawLoading);
    const [filter, setFilter] = useState({ visibility: '', theme: '' });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [canCreate, setCanCreate] = useState(false);
    const initialLoaded = useRef(false);

    useEffect(() => {
        loadData();
        checkEligibility();
    }, [view, filter, page]);

    const checkEligibility = async () => {
        try {
            const result = await checkHubEligibility();
            setCanCreate(result.eligible);
        } catch (error) {
            console.error('Failed to check eligibility:', error);
        }
    };

    const loadData = async () => {
        setRawLoading(true);
        try {
            if (view === 'discover') {
                const result = await fetchHubs(filter.visibility, filter.theme, page, 20);
                const next = result.hubs || [];
                setHubs(page > 1 ? prev => [...prev, ...next] : next);
                setHasMore(result.pagination?.currentPage < result.pagination?.totalPages);
            } else if (view === 'my-hubs') {
                const result = await fetchMyHubs();
                setMyHubs(result.hubs || []);
            } else if (view === 'invites') {
                const result = await fetchHubInvites();
                setInvites(result.invites || []);
            }
        } catch (error) {
            console.error('Failed to load hubs:', error);
        } finally {
            setRawLoading(false);
            initialLoaded.current = true;
        }
    };

    const themes = [
        { value: '', label: 'All Themes' },
        { value: 'general', label: 'General' },
        { value: 'scifi', label: 'Sci-Fi' },
        { value: 'fantasy', label: 'Fantasy' },
        { value: 'poetry', label: 'Poetry' },
        { value: 'mystery', label: 'Mystery' },
        { value: 'horror', label: 'Horror' },
        { value: 'romance', label: 'Romance' },
        { value: 'nonfiction', label: 'Non-Fiction' },
    ];

    if (loading && !initialLoaded.current) {
        return <SkeletonHubsPage />;
    }

    return (
        <div style={{
            fontFamily: 'var(--font-serif)',
            background: 'transparent',
            minHeight: '100vh',
            padding: '20px',
        }}>
            {/* Header */}
            <div style={{
                maxWidth: '900px',
                margin: '0 auto',
                marginBottom: '30px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                    <button
                        onClick={onBack}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '5px 10px',
                        }}
                    >
                        ←
                    </button>
                    <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '600' }}>
                        Collaborative Hubs
                    </h1>
                </div>

                <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6' }}>
                    Join writing communities to collaborate on stories, share ideas, and grow together.
                </p>

                {/* Navigation Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '10px',
                    marginBottom: '20px',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '10px',
                }}>
                    {['discover', 'my-hubs', 'invites'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => {
                                setView(tab);
                                setPage(1);
                            }}
                            style={{
                                background: view === tab ? 'var(--accent)' : 'transparent',
                                color: view === tab ? 'var(--accent-contrast)' : 'var(--text-secondary)',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontSize: '14px',
                                textTransform: 'capitalize',
                                transition: 'all 0.2s',
                            }}
                        >
                            {tab === 'my-hubs' ? 'My Hubs' : tab}
                            {tab === 'invites' && invites.length > 0 && (
                                <span style={{
                                    marginLeft: '6px',
                                    background: 'var(--rose)',
                                    color: 'var(--rose-contrast)',
                                    padding: '2px 6px',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '11px',
                                }}>
                                    {invites.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Filters & Create Button */}
                {view === 'discover' && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        <select
                            value={filter.theme}
                            onChange={(e) => {
                                setFilter({ ...filter, theme: e.target.value });
                                setPage(1);
                            }}
                            style={{
                                padding: '8px 12px',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '14px',
                                fontFamily: 'var(--font-sans)',
                            }}
                        >
                            {themes.map((theme) => (
                                <option key={theme.value} value={theme.value}>{theme.label}</option>
                            ))}
                        </select>

                        <div style={{ flex: 1 }} />

                        {canCreate && (
                            <button
                                onClick={onCreateHub}
                                style={{
                                    background: 'var(--accent)',
                                    color: 'var(--accent-contrast)',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                }}
                            >
                                + Create Hub
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {loading ? (
                    <div>
                        {[1, 2, 3, 4].map(i => <SkeletonHubCard key={i} />)}
                    </div>
                ) : (
                    <>
                        {view === 'discover' && (
                            <>
                                {hubs.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                        No hubs found matching your filters.
                                    </div>
                                ) : (
                                    <>
                                        {hubs.map((hub) => <HubCard key={hub.hubId} hub={hub} onClick={() => onHubClick(hub.hubId)} />)}
                                        {hasMore && (
                                            <button
                                                onClick={() => setPage(page + 1)}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    background: 'var(--bg-subtle)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: 'var(--radius-md)',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                }}
                                            >
                                                Load More
                                            </button>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        {view === 'my-hubs' && (
                            <>
                                {myHubs.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                        You haven't joined any hubs yet. Explore hubs to get started!
                                    </div>
                                ) : (
                                    myHubs.map((hub) => <HubCard key={hub.hubId} hub={hub} onClick={() => onHubClick(hub.hubId)} />)
                                )}
                            </>
                        )}

                        {view === 'invites' && (
                            <>
                                {invites.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                                        No pending invites.
                                    </div>
                                ) : (
                                    invites.map((invite) => (
                                        <div key={invite._id} style={{
                                            padding: '20px',
                                            border: '1px solid var(--amber-border)',
                                            borderRadius: 'var(--radius-md)',
                                            marginBottom: '15px',
                                            background: 'var(--bg-subtle)',
                                        }}>
                                            <div style={{ marginBottom: '10px' }}>
                                                <strong>{invite.inviterUsername}</strong> invited you to join{' '}
                                                <strong>{invite.hubName}</strong>
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                                                {new Date(invite.createdAt).toLocaleDateString()}
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button
                                                    onClick={() => onHubClick(invite.hubId)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: 'var(--accent)',
                                                        color: 'var(--accent-contrast)',
                                                        border: 'none',
                                                        borderRadius: 'var(--radius-md)',
                                                        cursor: 'pointer',
                                                        fontSize: '14px',
                                                    }}
                                                >
                                                    View Hub
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
