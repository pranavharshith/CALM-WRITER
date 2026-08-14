import React from 'react';
import styles from './AdminDashboardStyles';

import { PageHeader, LargeKPICard, MetricCard, ChartCard, QuickStat, InfoPanel } from './widgets';

function SystemHealth({ stats }) {
    const { systemHealth = {} } = stats || {};

    return (
        <div style={styles.pageContainer}>
            <PageHeader title="System Health" />

            <div style={styles.kpiRow}>
                <LargeKPICard title="Status" value="Operational" color="#00cc6a" />
                <LargeKPICard title="Database" value={systemHealth.dbSize} subtitle="Storage used" color="#0073bb" />
            </div>

            <InfoPanel title="System Information">
                <p><strong>Last Updated:</strong> {systemHealth.timestamp ? new Date(systemHealth.timestamp).toLocaleString() : 'N/A'}</p>
                <p><strong>Database Size:</strong> {systemHealth.dbSize}</p>
                <p><strong>Platform Status:</strong> All systems operational</p>
            </InfoPanel>
        </div>
    );
}

// Reusable Components

export default SystemHealth;
