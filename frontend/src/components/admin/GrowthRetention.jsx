import React from 'react';
import styles from '../AdminDashboardStyles';

import { PageHeader, LargeKPICard, MetricCard, ChartCard, QuickStat, InfoPanel } from './widgets';

function GrowthRetention({ stats }) {
    const { userIntelligence = {} } = stats || {};

    return (
        <div style={styles.pageContainer}>
            <PageHeader title="Growth & Retention" />

            <div style={styles.kpiRow}>
                <LargeKPICard title="DAU" value={userIntelligence.dau} subtitle="Daily active" color="#0073bb" />
                <LargeKPICard title="MAU" value={userIntelligence.mau} subtitle="Monthly active" color="#00a4a6" />
                <LargeKPICard title="Stickiness" value={`${userIntelligence.dauMauRatio ?? 0}%`} subtitle="DAU/MAU ratio" color="#00cc6a" />
                <LargeKPICard title="Churn" value={`${userIntelligence.churnRate ?? 0}%`} subtitle="Inactive >30d" color="#e81123" />
            </div>

            <div style={styles.metricsGrid}>
                <MetricCard label="New Users (30d)" value={userIntelligence.newUsersLast30Days} />
                <MetricCard label="New Users (7d)" value={userIntelligence.newUsersLast7Days} />
                <MetricCard label="New Users (Today)" value={userIntelligence.newUsersToday} />
                <MetricCard label="OTP Success" value={`${userIntelligence.otpSuccessRate ?? 0}%`} />
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

export default GrowthRetention;
