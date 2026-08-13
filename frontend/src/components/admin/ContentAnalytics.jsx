import React from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import styles from '../AdminDashboardStyles';
import { PageHeader, LargeKPICard, MetricCard, ChartCard, QuickStat, InfoPanel, COLORS } from './widgets';

function ContentAnalytics({ stats }) {
    const { contentEcosystem = {} } = stats || {};

    const hourlyData = (contentEcosystem.storiesByHour || []).map(item => ({
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
                    value={`${contentEcosystem.calmCompliance ?? 0}%`}
                    subtitle="Stories ≥800 words"
                    color="#00cc6a"
                />
            </div>

            {/* Content Quality Metrics */}
            <div style={styles.metricsGrid}>
                <MetricCard label="Stories Over 800 Words" value={contentEcosystem.storiesOver800} />
                <MetricCard label="Orphaned Stories" value={contentEcosystem.orphanedStories} />
                <MetricCard label="Orphaned %" value={`${contentEcosystem.orphanedPercentage ?? 0}%`} />
                <MetricCard label="Avg Thread Depth" value={(contentEcosystem.avgThreadDepth ?? 0).toFixed(1)} />
                <MetricCard label="Continuations" value={contentEcosystem.continuations} />
                <MetricCard label="Responses" value={contentEcosystem.responses} />
            </div>

            {/* Writing Patterns Chart */}
            <ChartCard title="Writing Patterns - Stories by Hour of Day">
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="hour" stroke="var(--text-tertiary)" style={{ fontSize: '13px' }} />
                        <YAxis stroke="var(--text-tertiary)" style={{ fontSize: '13px' }} />
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
                <p><strong>Calm Compliance ({contentEcosystem.calmCompliance ?? 0}%):</strong> Stories meeting the 800-word thoughtful writing goal</p>
                <p><strong>Orphaned Stories ({contentEcosystem.orphanedPercentage ?? 0}%):</strong> Stories with zero engagement (no likes or replies)</p>
                <p><strong>Thread Depth ({(contentEcosystem.avgThreadDepth ?? 0).toFixed(1)}):</strong> Average number of responses per story thread</p>
                <p><strong>Peak Writing Hours:</strong> Most stories published between {hourlyData.reduce((max, item) => item.stories > max.stories ? item : max, { stories: 0, hour: 'N/A' }).hour}</p>
            </InfoPanel>
        </div>
    );
}

// Engagement Analytics

export default ContentAnalytics;
