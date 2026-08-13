import React, { useState, useEffect } from 'react';
import { fetchWriterAnalytics } from '../api/api';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import { SkeletonAnalyticsDashboard, SkeletonAnalyticsRow } from './SkeletonLoader';

export default function AnalyticsDashboard({ onBack }) {
    const [stories, setStories] = useState([]);
    const [stats, setStats] = useState(null);
    const [dailyStats, setDailyStats] = useState([]);

    const [loading, setLoading] = useState(true); // Initial full page load
    const [loadingMore, setLoadingMore] = useState(false); // Pagination load
    const [error, setError] = useState('');

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const STORIES_PER_PAGE = 3;

    useEffect(() => {
        loadAnalytics(1);
    }, []);

    const loadAnalytics = async (pageNum) => {
        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            // Artificial minimum delay for UX consistency (800ms)
            const minDelay = new Promise(resolve => setTimeout(resolve, 800));

            const [result] = await Promise.all([
                fetchWriterAnalytics(pageNum, STORIES_PER_PAGE),
                minDelay
            ]);

            if (result.success) {
                if (pageNum === 1) {
                    setStats(result.stats);
                    setDailyStats(result.dailyStats);
                    setStories(result.stories);
                } else {
                    setStories(prev => [...prev, ...result.stories]);
                }

                // Check if we have more stories
                setHasMore(result.pagination ? result.pagination.hasNext : result.stories.length === STORIES_PER_PAGE);
                setPage(pageNum);
            } else {
                setError(result.error || 'Failed to load analytics');
            }
        } catch (err) {
            setError('Failed to load analytics');
            console.error(err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            loadAnalytics(page + 1);
        }
    };

    if (loading) {
        return <SkeletonAnalyticsDashboard />;
    }

    if (error) {
        return (
            <div className="container" style={{ paddingTop: '40px', textAlign: 'center' }}>
                <div className="alert alert--error mb-4">{error}</div>
                <button onClick={onBack} className="btn btn--secondary">Go Back</button>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="flex-between mb-6" style={{ marginTop: '20px' }}>
                <div>
                    <button onClick={onBack} className="btn-back mb-2">← Back</button>
                    <h1 style={{ fontSize: 'var(--fs-2xl)', fontFamily: 'var(--font-serif)', fontWeight: 600 }}>
                        Writer Analytics
                    </h1>
                </div>
                <div className="text-muted text-sm">
                    Last 30 Days
                </div>
            </div>

            {/* Summary Cards */}
            <div className="flex gap-4 mb-8" style={{ flexWrap: 'wrap' }}>
                <div className="card p-4" style={{ flex: '1', minWidth: '200px', padding: '24px' }}>
                    <div className="text-secondary text-sm mb-1">Total Views</div>
                    <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {stats?.totalViews?.toLocaleString() || 0}
                    </div>
                </div>
                <div className="card p-4" style={{ flex: '1', minWidth: '200px', padding: '24px' }}>
                    <div className="text-secondary text-sm mb-1">Total Reads</div>
                    <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {stats?.totalReads?.toLocaleString() || 0}
                    </div>
                </div>
                <div className="card p-4" style={{ flex: '1', minWidth: '200px', padding: '24px' }}>
                    <div className="text-secondary text-sm mb-1">Total Likes</div>
                    <div style={{ fontSize: 'var(--fs-3xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {stats?.totalLikes?.toLocaleString() || 0}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="card mb-8" style={{ padding: '24px' }}>
                <h2 className="mb-6" style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>
                    Performance Over Time
                </h2>
                <div style={{ height: '300px', width: '100%' }}>
                    {dailyStats && dailyStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyStats}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorReads" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--sage-dark)" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="var(--sage-dark)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis
                                    dataKey="_id"
                                    tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }}
                                    axisLine={{ stroke: 'var(--border)' }}
                                    tickLine={false}
                                    tickFormatter={(str) => {
                                        const date = new Date(str);
                                        return `${date.getDate()}/${date.getMonth() + 1}`;
                                    }}
                                />
                                <YAxis
                                    tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="views"
                                    name="Views"
                                    stroke="var(--accent)"
                                    fillOpacity={1}
                                    fill="url(#colorViews)"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="reads"
                                    name="Reads"
                                    stroke="var(--sage-dark)"
                                    fillOpacity={1}
                                    fill="url(#colorReads)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex-center" style={{ height: '100%', color: 'var(--text-tertiary)' }}>
                            No data available for the last 30 days
                        </div>
                    )}
                </div>
            </div>

            {/* Stories Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>Story Breakdown</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Title</th>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Date</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Views</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Reads</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Likes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stories.map(story => (
                                <tr key={story._id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '16px 24px', fontWeight: 500 }}>
                                        {story.title || 'Untitled'}
                                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 400 }}>{story.wordCount} words</div>
                                    </td>
                                    <td style={{ padding: '16px 24px', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                                        {new Date(story.createdAt).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 'var(--fs-sm)' }}>
                                        {story.views.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 'var(--fs-sm)' }}>
                                        {story.reads.toLocaleString()}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontSize: 'var(--fs-sm)' }}>
                                        {story.likes.toLocaleString()}
                                    </td>
                                </tr>
                            ))}

                            {/* Skeleton Rows for Loading More */}
                            {loadingMore && (
                                <>
                                    {[1, 2, 3].map(i => (
                                        <SkeletonAnalyticsRow key={`skeleton-${i}`} />
                                    ))}
                                </>
                            )}
                        </tbody>
                    </table>

                    {stories.length === 0 && !loading && (
                        <div className="p-8 text-center text-muted">You haven't written any stories yet.</div>
                    )}

                    {/* Load More / Show Less Controls */}
                    {(hasMore || stories.length > 3) && !loading && (
                        <div className="flex gap-4 mt-6" style={{ padding: '16px', display: 'flex', gap: '16px' }}>
                            {hasMore && (
                                <button
                                    className="btn btn--outline"
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    style={{ flex: 1 }}
                                >
                                    {loadingMore ? 'Loading Stories...' : 'Show More Stories'}
                                </button>
                            )}

                            {stories.length > 3 && !loadingMore && (
                                <button
                                    className="btn btn--ghost"
                                    onClick={() => {
                                        setStories(prev => prev.slice(0, 3));
                                        setPage(1);
                                        setHasMore(true);
                                        // Scroll back to table top
                                        document.querySelector('.card table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    style={{ flex: 1, color: 'var(--text-secondary)' }}
                                >
                                    Show Less
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
