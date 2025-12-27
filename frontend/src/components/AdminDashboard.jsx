import React, { useState, useEffect } from 'react';
import { fetchAdminStats, fetchAdminActivity } from '../api/api';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { OverviewDashboard, UserAnalytics, ContentAnalytics, EngagementAnalytics, GrowthRetention, ModerationDashboard, SystemHealth } from './AdminDashboardPages';
import styles from './AdminDashboardStyles';

const COLORS = ['#0073bb', '#00a4a6', '#f7b500', '#e81123', '#00cc6a', '#8764b8'];

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
            <div style={styles.container}>
                <div style={styles.loadingContainer}>
                    <div style={styles.loadingSpinner}></div>
                    <div style={styles.loadingText}>Loading Analytics Dashboard...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.errorContainer}>
                    <div style={styles.errorText}>{error}</div>
                    <button onClick={loadData} style={styles.retryButton}>Retry</button>
                    <button onClick={onBack} style={styles.backButton}>Back to Community</button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
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
            <div style={styles.mainLayout}>
                {/* Sidebar Navigation */}
                <div style={styles.sidebar}>
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
