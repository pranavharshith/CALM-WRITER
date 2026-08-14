import React from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import styles from './AdminDashboardStyles';
import { PageHeader, LargeKPICard, MetricCard, ChartCard, QuickStat, InfoPanel, COLORS } from './widgets';

function ModerationDashboard({ stats }) {
    const { moderation = {} } = stats || {};

    const outcomeData = (moderation.reportOutcomes || []).map(outcome => ({
        name: outcome._id.charAt(0).toUpperCase() + outcome._id.slice(1),
        value: outcome.count
    }));

    const reasonData = (moderation.reportsByReason || []).map(reason => ({
        name: reason._id.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        value: reason.count
    }));

    return (
        <div style={styles.pageContainer}>
            <PageHeader title="Moderation Dashboard" />

            <div style={styles.kpiRow}>
                <LargeKPICard title="Total Reports" value={moderation.totalReports} color="#0073bb" />
                <LargeKPICard title="Pending" value={moderation.pendingReports} alert={moderation.pendingReports > 0} color={moderation.pendingReports > 0 ? "#e81123" : "#00cc6a"} />
                <LargeKPICard title="Avg Resolution" value={`${moderation.avgResolutionTimeHours ?? 0}h`} subtitle="Time to resolve" color="#f7b500" />
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
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="name" stroke="var(--text-tertiary)" style={{ fontSize: '12px' }} />
                            <YAxis stroke="var(--text-tertiary)" style={{ fontSize: '12px' }} />
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

export default ModerationDashboard;
