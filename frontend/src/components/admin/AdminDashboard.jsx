import React, { useState, useEffect } from 'react';
import { fetchAdminStats, fetchAdminActivity } from '../../api/api';
import { OverviewDashboard, UserAnalytics, ContentAnalytics, EngagementAnalytics, GrowthRetention, ModerationDashboard, SystemHealth } from '.';
import styles from './AdminDashboardStyles';

export default function AdminDashboard({ user, onBack }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 60000); // Refresh every 60 seconds
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [statsData, activityData] = await Promise.all([
                fetchAdminStats(),
                fetchAdminActivity(50)
            ]);
            setStats(statsData);
            setActivity(activityData.activities || []);
            setError('');
        } catch (err) {
            setError('Failed to load admin data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-shell" style={styles.container}>
                {/* Top nav skeleton */}
                <div style={styles.topNav}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div className="skeleton-shimmer" style={{ width: 130, height: 18, borderRadius: 4 }} />
                        <div className="skeleton-shimmer" style={{ width: 1, height: 20, borderRadius: 0 }} />
                        <div className="skeleton-shimmer" style={{ width: 100, height: 14, borderRadius: 4 }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="skeleton-shimmer" style={{ width: 110, height: 30, borderRadius: 4 }} />
                        <div className="skeleton-shimmer" style={{ width: 100, height: 30, borderRadius: 4 }} />
                    </div>
                </div>

                {/* Main layout */}
                <div className="admin-shell__layout" style={styles.mainLayout}>
                    {/* Sidebar skeleton */}
                    <div className="admin-shell__sidebar" style={styles.sidebar}>
                        <div style={{ padding: '0 20px', marginBottom: 24 }}>
                            <div className="skeleton-shimmer" style={{ width: 70, height: 10, borderRadius: 3, marginBottom: 12 }} />
                            {[100, 90, 110, 95, 105].map((w, i) => (
                                <div key={i} className="skeleton-shimmer" style={{ width: `${w}%`, height: 36, borderRadius: 4, marginBottom: 4 }} />
                            ))}
                        </div>
                        <div style={{ padding: '0 20px' }}>
                            <div className="skeleton-shimmer" style={{ width: 70, height: 10, borderRadius: 3, marginBottom: 12 }} />
                            {[100, 90].map((w, i) => (
                                <div key={i} className="skeleton-shimmer" style={{ width: `${w}%`, height: 36, borderRadius: 4, marginBottom: 4 }} />
                            ))}
                        </div>
                    </div>

                    {/* Content area skeleton */}
                    <div style={{ ...styles.contentArea }}>
                        <div style={styles.pageContainer}>
                            {/* Page title */}
                            <div className="skeleton-shimmer" style={{ width: 200, height: 28, borderRadius: 4, marginBottom: 32 }} />

                            {/* KPI cards row — 4 cards */}
                            <div style={styles.kpiRow}>
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} style={{ ...styles.largeKPI, borderTopColor: 'var(--border)' }}>
                                        <div className="skeleton-shimmer" style={{ width: '60%', height: 12, borderRadius: 3, marginBottom: 14 }} />
                                        <div className="skeleton-shimmer" style={{ width: '45%', height: 34, borderRadius: 4, marginBottom: 10 }} />
                                        <div className="skeleton-shimmer" style={{ width: '40%', height: 11, borderRadius: 3 }} />
                                    </div>
                                ))}
                            </div>

                            {/* Metric cards row — 6 smaller cards */}
                            <div style={styles.metricsGrid}>
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} style={styles.metricCard}>
                                        <div className="skeleton-shimmer" style={{ width: '70%', height: 11, borderRadius: 3, margin: '0 auto 10px' }} />
                                        <div className="skeleton-shimmer" style={{ width: '50%', height: 26, borderRadius: 4, margin: '0 auto' }} />
                                    </div>
                                ))}
                            </div>

                            {/* Chart area — wide card + narrow activity feed */}
                            <div style={styles.chartsRow}>
                                <div style={{ ...styles.chartCard, flex: '7 1 0' }}>
                                    <div className="skeleton-shimmer" style={{ width: 220, height: 16, borderRadius: 3, marginBottom: 24 }} />
                                    <div className="skeleton-shimmer" style={{ width: '100%', height: 300, borderRadius: 6 }} />
                                </div>
                                <div style={{ ...styles.chartCard, flex: '3 1 0', minWidth: 200 }}>
                                    <div className="skeleton-shimmer" style={{ width: 140, height: 16, borderRadius: 3, marginBottom: 20 }} />
                                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                        <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 14, borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
                                            <div className="skeleton-shimmer" style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0 }} />
                                            <div style={{ flex: 1 }}>
                                                <div className="skeleton-shimmer" style={{ width: '90%', height: 11, borderRadius: 3, marginBottom: 6 }} />
                                                <div className="skeleton-shimmer" style={{ width: '45%', height: 10, borderRadius: 3 }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quick stats grid */}
                            <div style={styles.quickStatsSection}>
                                <div className="skeleton-shimmer" style={{ width: 140, height: 18, borderRadius: 3, marginBottom: 16 }} />
                                <div style={styles.quickStatsGrid}>
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <div key={i} style={styles.quickStat}>
                                            <div className="skeleton-shimmer" style={{ width: '50%', height: 28, borderRadius: 4, margin: '0 auto 10px' }} />
                                            <div className="skeleton-shimmer" style={{ width: '65%', height: 12, borderRadius: 3, margin: '0 auto 6px' }} />
                                            <div className="skeleton-shimmer" style={{ width: '80%', height: 10, borderRadius: 3, margin: '0 auto' }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-shell" style={styles.container}>
                <div style={styles.errorContainer}>
                    <div style={styles.errorText}>{error}</div>
                    <button onClick={loadData} style={styles.retryButton}>Retry</button>
                    <button onClick={onBack} style={styles.backButton}>Back to Community</button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-shell" style={styles.container}>
            {/* Top Navigation Bar */}
            <div style={styles.topNav}>
                <div style={styles.navLeft}>
                    <h1 style={styles.appTitle}>CALM WRITER</h1>
                    <span style={styles.navSeparator}>|</span>
                    <span style={styles.navSection}>Admin Console</span>
                </div>
                <div style={styles.navRight}>
                    <span style={styles.adminBadge}>Admin: {user?.username}</span>
                    <button onClick={onBack} style={styles.exitButton}>Exit Console</button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="admin-shell__layout" style={styles.mainLayout}>
                {/* Sidebar Navigation */}
                <div className="admin-shell__sidebar" style={styles.sidebar}>
                    <div style={styles.sidebarSection}>
                        <div style={styles.sidebarTitle}>ANALYTICS</div>
                        <button
                            onClick={() => setActiveTab('overview')}
                            style={activeTab === 'overview' ? styles.tabActive : styles.tab}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            style={activeTab === 'users' ? styles.tabActive : styles.tab}
                        >
                            User Analytics
                        </button>
                        <button
                            onClick={() => setActiveTab('content')}
                            style={activeTab === 'content' ? styles.tabActive : styles.tab}
                        >
                            Content Analytics
                        </button>
                        <button
                            onClick={() => setActiveTab('engagement')}
                            style={activeTab === 'engagement' ? styles.tabActive : styles.tab}
                        >
                            Engagement Metrics
                        </button>
                        <button
                            onClick={() => setActiveTab('growth')}
                            style={activeTab === 'growth' ? styles.tabActive : styles.tab}
                        >
                            Growth & Retention
                        </button>
                    </div>
                    <div style={styles.sidebarSection}>
                        <div style={styles.sidebarTitle}>OPERATIONS</div>
                        <button
                            onClick={() => setActiveTab('moderation')}
                            style={activeTab === 'moderation' ? styles.tabActive : styles.tab}
                        >
                            Moderation
                        </button>
                        <button
                            onClick={() => setActiveTab('system')}
                            style={activeTab === 'system' ? styles.tabActive : styles.tab}
                        >
                            System Health
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div style={styles.contentArea}>
                    {activeTab === 'overview' && <OverviewDashboard stats={stats} activity={activity} />}
                    {activeTab === 'users' && <UserAnalytics stats={stats} />}
                    {activeTab === 'content' && <ContentAnalytics stats={stats} />}
                    {activeTab === 'engagement' && <EngagementAnalytics stats={stats} />}
                    {activeTab === 'growth' && <GrowthRetention stats={stats} />}
                    {activeTab === 'moderation' && <ModerationDashboard stats={stats} />}
                    {activeTab === 'system' && <SystemHealth stats={stats} />}
                </div>
            </div>
        </div>
    );
}
