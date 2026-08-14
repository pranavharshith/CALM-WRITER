import React from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import styles from './AdminDashboardStyles';
import { PageHeader, LargeKPICard, MetricCard, ChartCard, QuickStat, InfoPanel, COLORS } from './widgets';

function UserAnalytics({ stats }) {
    const { userIntelligence = {} } = stats || {};

    const cohortData = (userIntelligence.growthCohorts || []).map(cohort => ({
        month: `${cohort._id.year}-${String(cohort._id.month).padStart(2, '0')}`,
        users: cohort.newUsers
    }));

    const roleData = (userIntelligence.roleDistribution || []).map(role => ({
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
                    value={`${userIntelligence.dauMauRatio ?? 0}%`}
                    subtitle="Stickiness metric"
                    color="#8764b8"
                />
            </div>

            {/* User Growth Metrics */}
            <div style={styles.metricsGrid}>
                <MetricCard label="New Users (Today)" value={userIntelligence.newUsersToday} />
                <MetricCard label="New Users (7 Days)" value={userIntelligence.newUsersLast7Days} />
                <MetricCard label="New Users (30 Days)" value={userIntelligence.newUsersLast30Days} />
                <MetricCard label="Churn Rate" value={`${userIntelligence.churnRate ?? 0}%`} />
                <MetricCard label="OTP Success Rate" value={`${userIntelligence.otpSuccessRate ?? 0}%`} />
                <MetricCard label="Writer Percentage" value={`${userIntelligence.writerPercentage ?? 0}%`} />
            </div>

            {/* Charts */}
            <div style={styles.chartsRow}>
                <ChartCard title="6-Month User Growth Trend" width="65%">
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={cohortData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="month" stroke="var(--text-tertiary)" style={{ fontSize: '13px' }} />
                            <YAxis stroke="var(--text-tertiary)" style={{ fontSize: '13px' }} />
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
                    <MetricCard label="Network Density" value={`${(((userIntelligence.totalFollows ?? 0) / (userIntelligence.totalUsers || 1)) * 100).toFixed(1)}%`} />
                </div>
            </div>

            {/* Retention Insights */}
            <InfoPanel title="Retention Insights">
                <p><strong>DAU/MAU Ratio ({userIntelligence.dauMauRatio ?? 0}%):</strong> Measures user stickiness. Higher is better. Target: &gt;20%</p>
                <p><strong>Churn Rate ({userIntelligence.churnRate ?? 0}%):</strong> Users inactive for &gt;30 days. Lower is better. Target: &lt;30%</p>
                <p><strong>OTP Success Rate ({userIntelligence.otpSuccessRate ?? 0}%):</strong> Users completing signup. Higher is better. Target: &gt;70%</p>
                <p><strong>Writer Percentage ({userIntelligence.writerPercentage ?? 0}%):</strong> Active contributors vs lurkers. Target: &gt;15%</p>
            </InfoPanel>
        </div>
    );
}

// Content Analytics - Story and thread metrics

export default UserAnalytics;
