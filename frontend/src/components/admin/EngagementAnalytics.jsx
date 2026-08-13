import React from 'react';
import styles from '../AdminDashboardStyles';

import { PageHeader, LargeKPICard, MetricCard, ChartCard, QuickStat, InfoPanel } from './widgets';

function EngagementAnalytics({ stats }) {
    const { engagement = {} } = stats || {};

    return (
        <div style={styles.pageContainer}>
            <PageHeader title="Engagement Metrics" />

            <div style={styles.kpiRow}>
                <LargeKPICard title="Total Reads" value={engagement.totalReads} color="#0073bb" />
                <LargeKPICard title="Completion Rate" value={`${engagement.completionRate ?? 0}%`} subtitle="Reads ≥90%" color="#00cc6a" />
                <LargeKPICard title="Avg Read %" value={`${engagement.avgReadPercent ?? 0}%`} color="#f7b500" />
                <LargeKPICard title="Total Likes" value={engagement.totalLikes} color="#e81123" />
            </div>

            <div style={styles.metricsGrid}>
                <MetricCard label="Read-to-Like Ratio" value={`${engagement.readToLikeRatio ?? 0}%`} description="Quality signal" />
                <MetricCard label="Bookmark Rate" value={`${engagement.bookmarkRate ?? 0}%`} description="High intent" />
                <MetricCard label="Total Bookmarks" value={engagement.totalBookmarks} />
                <MetricCard label="Reads (7d)" value={engagement.readsLast7Days} />
                <MetricCard label="Avg Read Time" value={`${((engagement.avgReadTime ?? 0) / 1000).toFixed(0)}s`} />
                <MetricCard label="Lurker Ratio" value={`${engagement.lurkerRatio ?? 0}%`} description="Readers only" />
            </div>

            <InfoPanel title="Engagement Insights">
                <p><strong>Read-to-Like Ratio ({engagement.readToLikeRatio ?? 0}%):</strong> Percentage of reads that result in a like - key quality indicator</p>
                <p><strong>Bookmark Rate ({engagement.bookmarkRate ?? 0}%):</strong> Percentage of reads that are bookmarked - high intent signal</p>
                <p><strong>Lurker Ratio ({engagement.lurkerRatio ?? 0}%):</strong> Users who read but never post - balance needed</p>
                <p><strong>Completion Rate ({engagement.completionRate ?? 0}%):</strong> Stories read to completion - content quality metric</p>
            </InfoPanel>
        </div>
    );
}

// Growth & Retention

export default EngagementAnalytics;
