import React from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import styles from './AdminDashboardStyles';
import { PageHeader, LargeKPICard, MetricCard, ChartCard, QuickStat, InfoPanel, COLORS } from './widgets';

function OverviewDashboard({ stats, activity }) {
    const {
        commandCenter = {},
        userIntelligence = {},
        contentEcosystem = {},
        engagement = {}
    } = stats || {};

    return (
        <div style={styles.pageContainer}>
            <PageHeader title="Platform Overview" />

            {/* Top KPI Cards */}
            <div style={styles.kpiRow}>
                <LargeKPICard
                    title="Total Users"
                    value={commandCenter.totalUsers}
                    trend={`+${userIntelligence.newUsersToday ?? 0} today`}
                    color="#0073bb"
                />
                <LargeKPICard
                    title="Active Now"
                    value={commandCenter.activeReadersNow}
                    subtitle="Reading stories"
                    color="#00a4a6"
                />
                <LargeKPICard
                    title="Stories Today"
                    value={commandCenter.storiesToday}
                    trend={`${commandCenter.todayVsYesterdayChange ?? 0}% vs yesterday`}
                    color="#f7b500"
                />
                <LargeKPICard
                    title="Pending Reports"
                    value={commandCenter.pendingReports}
                    alert={commandCenter.pendingReports > 0}
                    color={commandCenter.pendingReports > 0 ? "#e81123" : "#00cc6a"}
                />
            </div>

            {/* Secondary Metrics Row */}
            <div style={styles.metricsGrid}>
                <MetricCard label="Writers" value={commandCenter.writersCount} />
                <MetricCard label="Readers Only" value={commandCenter.readersOnlyCount} />
                <MetricCard label="DAU/MAU Ratio" value={`${userIntelligence.dauMauRatio ?? 0}%`} />
                <MetricCard label="Avg Read Time" value={`${((engagement.avgReadTime ?? 0) / 1000).toFixed(0)}s`} />
                <MetricCard label="Total Likes" value={engagement.totalLikes} />
                <MetricCard label="Total Bookmarks" value={engagement.totalBookmarks} />
            </div>

            {/* Charts Row */}
            <div style={styles.chartsRow}>
                <ChartCard title="Platform Activity (Last 24 Hours)" width="70%">
                    <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={(contentEcosystem.storiesByHour || []).map(item => ({
                            hour: `${item._id}:00`,
                            stories: item.count
                        }))}>
                            <defs>
                                <linearGradient id="colorStories" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0073bb" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#0073bb" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="hour" stroke="var(--text-tertiary)" style={{ fontSize: '12px' }} />
                            <YAxis stroke="var(--text-tertiary)" style={{ fontSize: '12px' }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="stories" stroke="#0073bb" fillOpacity={1} fill="url(#colorStories)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Recent Activity Feed" width="30%">
                    <div style={styles.activityFeed}>
                        {(activity || []).slice(0, 15).map((item, idx) => (
                            <div key={idx} style={styles.activityItem}>
                                <div style={styles.activityDot}></div>
                                <div style={styles.activityContent}>
                                    <div style={styles.activityMessage}>{item.message}</div>
                                    <div style={styles.activityTime}>
                                        {new Date(item.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </div>

            {/* Quick Stats Grid */}
            <div style={styles.quickStatsSection}>
                <h3 style={styles.sectionTitle}>Quick Statistics</h3>
                <div style={styles.quickStatsGrid}>
                    <QuickStat label="Completion Rate" value={`${engagement.completionRate ?? 0}%`} description="Stories read to end" />
                    <QuickStat label="Calm Compliance" value={`${contentEcosystem.calmCompliance ?? 0}%`} description="Stories ≥800 words" />
                    <QuickStat label="Orphaned Stories" value={`${contentEcosystem.orphanedPercentage ?? 0}%`} description="No engagement" />
                    <QuickStat label="Churn Rate" value={`${userIntelligence.churnRate ?? 0}%`} description="Inactive >30 days" />
                    <QuickStat label="Read-to-Like" value={`${engagement.readToLikeRatio ?? 0}%`} description="Quality signal" />
                    <QuickStat label="Writer %" value={`${userIntelligence.writerPercentage ?? 0}%`} description="Active contributors" />
                </div>
            </div>
        </div>
    );
}

// User Analytics - Detailed user metrics

export default OverviewDashboard;
