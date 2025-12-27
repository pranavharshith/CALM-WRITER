import React from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import styles from './AdminDashboardStyles';

const COLORS = ['#0073bb', '#00a4a6', '#f7b500', '#e81123', '#00cc6a', '#8764b8'];

// Overview Dashboard - Main landing page
function OverviewDashboard({ stats, activity }) {
    const { commandCenter, userIntelligence, contentEcosystem, engagement } = stats;

    return (
        <div style={styles.pageContainer}>
            <PageHeader title="Platform Overview" />

            {/* Top KPI Cards */}
            <div style={styles.kpiRow}>
                <LargeKPICard
                    title="Total Users"
                    value={commandCenter.totalUsers}
                    trend={`+${userIntelligence.newUsersToday} today`}
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
                    trend={`${commandCenter.todayVsYesterdayChange}% vs yesterday`}
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
                <MetricCard label="DAU/MAU Ratio" value={`${userIntelligence.dauMauRatio}%`} />
                <MetricCard label="Avg Read Time" value={`${(engagement.avgReadTime / 1000).toFixed(0)}s`} />
                <MetricCard label="Total Likes" value={engagement.totalLikes} />
                <MetricCard label="Total Bookmarks" value={engagement.totalBookmarks} />
            </div>

            {/* Charts Row */}
            <div style={styles.chartsRow}>
                <ChartCard title="Platform Activity (Last 24 Hours)" width="70%">
                    <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={contentEcosystem.storiesByHour.map(item => ({
                            hour: `${item._id}:00`,
                            stories: item.count
                        }))}>
                            <defs>
                                <linearGradient id="colorStories" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0073bb" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#0073bb" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="hour" stroke="#666" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="stories" stroke="#0073bb" fillOpacity={1} fill="url(#colorStories)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Recent Activity Feed" width="30%">
                    <div style={styles.activityFeed}>
                        {activity.slice(0, 15).map((item, idx) => (
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
                    <QuickStat label="Completion Rate" value={`${engagement.completionRate}%`} description="Stories read to end" />
                    <QuickStat label="Calm Compliance" value={`${contentEcosystem.calmCompliance}%`} description="Stories ≥800 words" />
                    <QuickStat label="Orphaned Stories" value={`${contentEcosystem.orphanedPercentage}%`} description="No engagement" />
                    <QuickStat label="Churn Rate" value={`${userIntelligence.churnRate}%`} description="Inactive >30 days" />
                    <QuickStat label="Read-to-Like" value={`${engagement.readToLikeRatio}%`} description="Quality signal" />
                    <QuickStat label="Writer %" value={`${userIntelligence.writerPercentage}%`} description="Active contributors" />
                </div>
            </div>
        </div>
    );
}

// User Analytics - Detailed user metrics
function UserAnalytics({ stats }) {
    const { userIntelligence } = stats;

    const cohortData = userIntelligence.growthCohorts.map(cohort => ({
        month: `${cohort._id.year}-${String(cohort._id.month).padStart(2, '0')}`,
        users: cohort.newUsers
    }));

    const roleData = userIntelligence.roleDistribution.map(role => ({
        name: role._id.charAt(0).toUpperCase() + role._id.slice(1),
        value: role.count
    }));

    return (
        <div style={styles.pageContainer}>
            <PageHeader title="User Analytics" />

            {/* User KPIs */}
            <div style={styles.kpiRow}>
                <LargeKPICard
                    title="Total Users"
                    value={userIntelligence.totalUsers}
                    color="#0073bb"
                />
                <LargeKPICard
                    title="Daily Active Users"
                    value={userIntelligence.dau}
                    subtitle="Last 24 hours"
                    color="#00a4a6"
                />
                <LargeKPICard
                    title="Monthly Active Users"
                    value={userIntelligence.mau}
                    subtitle="Last 30 days"
                    color="#f7b500"
                />
                <LargeKPICard
                    title="DAU/MAU Ratio"
                    value={`${userIntelligence.dauMauRatio}%`}
                    subtitle="Stickiness metric"
                    color="#8764b8"
                />
            </div>

            {/* User Growth Metrics */}
            <div style={styles.metricsGrid}>
                <MetricCard label="New Users (Today)" value={userIntelligence.newUsersToday} />
                <MetricCard label="New Users (7 Days)" value={userIntelligence.newUsersLast7Days} />
                <MetricCard label="New Users (30 Days)" value={userIntelligence.newUsersLast30Days} />
                <MetricCard label="Churn Rate" value={`${userIntelligence.churnRate}%`} />
                <MetricCard label="OTP Success Rate" value={`${userIntelligence.otpSuccessRate}%`} />
                <MetricCard label="Writer Percentage" value={`${userIntelligence.writerPercentage}%`} />
            </div>

            {/* Charts */}
            <div style={styles.chartsRow}>
                <ChartCard title="6-Month User Growth Trend" width="65%">
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={cohortData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="month" stroke="#666" style={{ fontSize: '13px' }} />
                            <YAxis stroke="#666" style={{ fontSize: '13px' }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="users" fill="#0073bb" name="New Users" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="User Role Distribution" width="35%">
                    <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                            <Pie
                                data={roleData}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={120}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {roleData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Social Metrics */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Social Network Metrics</h3>
                <div style={styles.metricsGrid}>
                    <MetricCard label="Total Follows" value={userIntelligence.totalFollows} />
                    <MetricCard label="Avg Follows Per User" value={userIntelligence.avgFollowsPerUser} />
                    <MetricCard label="Network Density" value={`${((userIntelligence.totalFollows / userIntelligence.totalUsers) * 100).toFixed(1)}%`} />
                </div>
            </div>

            {/* Retention Insights */}
            <InfoPanel title="Retention Insights">
                <p><strong>DAU/MAU Ratio ({userIntelligence.dauMauRatio}%):</strong> Measures user stickiness. Higher is better. Target: &gt;20%</p>
                <p><strong>Churn Rate ({userIntelligence.churnRate}%):</strong> Users inactive for &gt;30 days. Lower is better. Target: &lt;30%</p>
                <p><strong>OTP Success Rate ({userIntelligence.otpSuccessRate}%):</strong> Users completing signup. Higher is better. Target: &gt;70%</p>
                <p><strong>Writer Percentage ({userIntelligence.writerPercentage}%):</strong> Active contributors vs lurkers. Target: &gt;15%</p>
            </InfoPanel>
        </div>
    );
}

// Content Analytics - Story and thread metrics
function ContentAnalytics({ stats }) {
    const { contentEcosystem } = stats;

    const hourlyData = contentEcosystem.storiesByHour.map(item => ({
        hour: `${item._id}:00`,
        stories: item.count
    }));

    return (
        <div style={styles.pageContainer}>
            <PageHeader title="Content Analytics" />

            {/* Content KPIs */}
            <div style={styles.kpiRow}>
                <LargeKPICard
                    title="Total Stories"
                    value={contentEcosystem.totalStories}
                    color="#0073bb"
                />
                <LargeKPICard
                    title="Total Threads"
                    value={contentEcosystem.totalThreads}
                    subtitle="Continuations & responses"
                    color="#00a4a6"
                />
                <LargeKPICard
                    title="Avg Word Count"
                    value={contentEcosystem.avgWordCount}
                    subtitle="Per story"
                    color="#f7b500"
                />
                <LargeKPICard
                    title="Calm Compliance"
                    value={`${contentEcosystem.calmCompliance}%`}
                    subtitle="Stories ≥800 words"
                    color="#00cc6a"
                />
            </div>

            {/* Content Quality Metrics */}
            <div style={styles.metricsGrid}>
                <MetricCard label="Stories Over 800 Words" value={contentEcosystem.storiesOver800} />
                <MetricCard label="Orphaned Stories" value={contentEcosystem.orphanedStories} />
                <MetricCard label="Orphaned %" value={`${contentEcosystem.orphanedPercentage}%`} />
                <MetricCard label="Avg Thread Depth" value={contentEcosystem.avgThreadDepth.toFixed(1)} />
                <MetricCard label="Continuations" value={contentEcosystem.continuations} />
                <MetricCard label="Responses" value={contentEcosystem.responses} />
            </div>

            {/* Writing Patterns Chart */}
            <ChartCard title="Writing Patterns - Stories by Hour of Day">
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="hour" stroke="#666" style={{ fontSize: '13px' }} />
                        <YAxis stroke="#666" style={{ fontSize: '13px' }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="stories" stroke="#0073bb" strokeWidth={3} name="Stories Published" dot={{ r: 5 }} />
                    </LineChart>
                </ResponsiveContainer>
            </ChartCard>

            {/* Content Type Breakdown */}
            <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Content Type Distribution</h3>
                <div style={styles.metricsGrid}>
                    <MetricCard
                        label="Original Stories"
                        value={contentEcosystem.totalStories}
                        description="Root story posts"
                    />
                    <MetricCard
                        label="Continuations"
                        value={contentEcosystem.continuations}
                        description="Story extensions"
                    />
                    <MetricCard
                        label="Responses"
                        value={contentEcosystem.responses}
                        description="Thread replies"
                    />
                    <MetricCard
                        label="Featured Stories"
                        value={contentEcosystem.featuredStories}
                        description="Admin curated"
                    />
                </div>
            </div>

            {/* Content Quality Insights */}
            <InfoPanel title="Content Quality Insights">
                <p><strong>Calm Compliance ({contentEcosystem.calmCompliance}%):</strong> Stories meeting the 800-word thoughtful writing goal</p>
                <p><strong>Orphaned Stories ({contentEcosystem.orphanedPercentage}%):</strong> Stories with zero engagement (no likes or replies)</p>
                <p><strong>Thread Depth ({contentEcosystem.avgThreadDepth.toFixed(1)}):</strong> Average number of responses per story thread</p>
                <p><strong>Peak Writing Hours:</strong> Most stories published between {hourlyData.reduce((max, item) => item.stories > max.stories ? item : max).hour}</p>
            </InfoPanel>
        </div>
    );
}

// Engagement Analytics
function EngagementAnalytics({ stats }) {
    const { engagement } = stats;

    return (
        <div style={styles.pageContainer}>
            <PageHeader title="Engagement Metrics" />

            <div style={styles.kpiRow}>
                <LargeKPICard title="Total Reads" value={engagement.totalReads} color="#0073bb" />
                <LargeKPICard title="Completion Rate" value={`${engagement.completionRate}%`} subtitle="Reads ≥90%" color="#00cc6a" />
                <LargeKPICard title="Avg Read %" value={`${engagement.avgReadPercent}%`} color="#f7b500" />
                <LargeKPICard title="Total Likes" value={engagement.totalLikes} color="#e81123" />
            </div>

            <div style={styles.metricsGrid}>
                <MetricCard label="Read-to-Like Ratio" value={`${engagement.readToLikeRatio}%`} description="Quality signal" />
                <MetricCard label="Bookmark Rate" value={`${engagement.bookmarkRate}%`} description="High intent" />
                <MetricCard label="Total Bookmarks" value={engagement.totalBookmarks} />
                <MetricCard label="Reads (7d)" value={engagement.readsLast7Days} />
                <MetricCard label="Avg Read Time" value={`${(engagement.avgReadTime / 1000).toFixed(0)}s`} />
                <MetricCard label="Lurker Ratio" value={`${engagement.lurkerRatio}%`} description="Readers only" />
            </div>

            <InfoPanel title="Engagement Insights">
                <p><strong>Read-to-Like Ratio ({engagement.readToLikeRatio}%):</strong> Percentage of reads that result in a like - key quality indicator</p>
                <p><strong>Bookmark Rate ({engagement.bookmarkRate}%):</strong> Percentage of reads that are bookmarked - high intent signal</p>
                <p><strong>Lurker Ratio ({engagement.lurkerRatio}%):</strong> Users who read but never post - balance needed</p>
                <p><strong>Completion Rate ({engagement.completionRate}%):</strong> Stories read to completion - content quality metric</p>
            </InfoPanel>
        </div>
    );
}

// Growth & Retention
function GrowthRetention({ stats }) {
    const { userIntelligence } = stats;

    return (
        <div style={styles.pageContainer}>
            <PageHeader title="Growth & Retention" />

            <div style={styles.kpiRow}>
                <LargeKPICard title="DAU" value={userIntelligence.dau} subtitle="Daily active" color="#0073bb" />
                <LargeKPICard title="MAU" value={userIntelligence.mau} subtitle="Monthly active" color="#00a4a6" />
                <LargeKPICard title="Stickiness" value={`${userIntelligence.dauMauRatio}%`} subtitle="DAU/MAU ratio" color="#00cc6a" />
                <LargeKPICard title="Churn" value={`${userIntelligence.churnRate}%`} subtitle="Inactive >30d" color="#e81123" />
            </div>

            <div style={styles.metricsGrid}>
                <MetricCard label="New Users (30d)" value={userIntelligence.newUsersLast30Days} />
                <MetricCard label="New Users (7d)" value={userIntelligence.newUsersLast7Days} />
                <MetricCard label="New Users (Today)" value={userIntelligence.newUsersToday} />
                <MetricCard label="OTP Success" value={`${userIntelligence.otpSuccessRate}%`} />
            </div>

            <InfoPanel title="Retention Strategy">
                <p><strong>Target DAU/MAU:</strong> &gt;20% indicates good user stickiness and regular engagement</p>
                <p><strong>Acceptable Churn:</strong> &lt;30% monthly churn rate is healthy for content platforms</p>
                <p><strong>Activation:</strong> OTP success rate &gt;70% shows smooth onboarding experience</p>
            </InfoPanel>
        </div>
    );
}

// Moderation Dashboard
function ModerationDashboard({ stats }) {
    const { moderation } = stats;

    const outcomeData = moderation.reportOutcomes.map(outcome => ({
        name: outcome._id.charAt(0).toUpperCase() + outcome._id.slice(1),
        value: outcome.count
    }));

    const reasonData = moderation.reportsByReason.map(reason => ({
        name: reason._id.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        value: reason.count
    }));

    return (
        <div style={styles.pageContainer}>
            <PageHeader title="Moderation Dashboard" />

            <div style={styles.kpiRow}>
                <LargeKPICard title="Total Reports" value={moderation.totalReports} color="#0073bb" />
                <LargeKPICard title="Pending" value={moderation.pendingReports} alert={moderation.pendingReports > 0} color={moderation.pendingReports > 0 ? "#e81123" : "#00cc6a"} />
                <LargeKPICard title="Avg Resolution" value={`${moderation.avgResolutionTimeHours}h`} subtitle="Time to resolve" color="#f7b500" />
            </div>

            <div style={styles.chartsRow}>
                <ChartCard title="Report Outcomes" width="50%">
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Pie data={outcomeData} cx="50%" cy="50%" labelLine={true} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
                                {outcomeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Reports by Reason" width="50%">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={reasonData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="name" stroke="#666" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#0073bb" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    );
}

// System Health
function SystemHealth({ stats }) {
    const { systemHealth } = stats;

    return (
        <div style={styles.pageContainer}>
            <PageHeader title="System Health" />

            <div style={styles.kpiRow}>
                <LargeKPICard title="Status" value="Operational" color="#00cc6a" />
                <LargeKPICard title="Database" value={systemHealth.dbSize} subtitle="Storage used" color="#0073bb" />
            </div>

            <InfoPanel title="System Information">
                <p><strong>Last Updated:</strong> {new Date(systemHealth.timestamp).toLocaleString()}</p>
                <p><strong>Database Size:</strong> {systemHealth.dbSize}</p>
                <p><strong>Platform Status:</strong> All systems operational</p>
            </InfoPanel>
        </div>
    );
}

// Reusable Components
function PageHeader({ title, subtitle }) {
    return (
        <div style={styles.pageHeader}>
            <h1 style={styles.pageTitle}>{title}</h1>
            {subtitle && <p style={styles.pageSubtitle}>{subtitle}</p>}
        </div>
    );
}

function LargeKPICard({ title, value, subtitle, trend, color, icon, alert }) {
    return (
        <div style={{ ...styles.largeKPI, borderTopColor: color }}>
            <div style={styles.kpiHeader}>{title}</div>
            <div style={{ ...styles.kpiValue, color: alert ? '#e81123' : '#000' }}>{value}</div>
            {subtitle && <div style={styles.kpiSubtitle}>{subtitle}</div>}
            {trend && <div style={styles.kpiTrend}>{trend}</div>}
        </div>
    );
}

function MetricCard({ label, value, description }) {
    return (
        <div style={styles.metricCard}>
            <div style={styles.metricLabel}>{label}</div>
            <div style={styles.metricValue}>{value}</div>
            {description && <div style={styles.metricDesc}>{description}</div>}
        </div>
    );
}

function ChartCard({ title, children, width = "100%" }) {
    return (
        <div style={{ ...styles.chartCard, width }}>
            <h3 style={styles.chartTitle}>{title}</h3>
            <div style={styles.chartContent}>{children}</div>
        </div>
    );
}

function QuickStat({ label, value, description }) {
    return (
        <div style={styles.quickStat}>
            <div style={styles.quickStatValue}>{value}</div>
            <div style={styles.quickStatLabel}>{label}</div>
            <div style={styles.quickStatDesc}>{description}</div>
        </div>
    );
}

function InfoPanel({ title, children }) {
    return (
        <div style={styles.infoPanel}>
            <h3 style={styles.infoPanelTitle}>{title}</h3>
            <div style={styles.infoPanelContent}>{children}</div>
        </div>
    );
}

export { OverviewDashboard, UserAnalytics, ContentAnalytics, EngagementAnalytics, GrowthRetention, ModerationDashboard, SystemHealth };
