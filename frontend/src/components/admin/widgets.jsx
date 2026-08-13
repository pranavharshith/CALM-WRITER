import React from 'react';
import styles from '../AdminDashboardStyles';

export const COLORS = ['#0073bb', '#00a4a6', '#f7b500', '#e81123', '#00cc6a', '#8764b8'];

export function PageHeader({ title, subtitle }) {
    return (
        <div style={styles.pageHeader}>
            <h1 style={styles.pageTitle}>{title}</h1>
            {subtitle && <p style={styles.pageSubtitle}>{subtitle}</p>}
        </div>
    );
}

export function LargeKPICard({ title, value, subtitle, trend, color, alert }) {
    return (
        <div style={{ ...styles.largeKPI, borderTopColor: color }}>
            <div style={styles.kpiHeader}>{title}</div>
            <div style={{ ...styles.kpiValue, color: alert ? 'var(--rose-dark)' : 'var(--text-primary)' }}>{value}</div>
            {subtitle && <div style={styles.kpiSubtitle}>{subtitle}</div>}
            {trend && <div style={styles.kpiTrend}>{trend}</div>}
        </div>
    );
}

export function MetricCard({ label, value, description }) {
    return (
        <div style={styles.metricCard}>
            <div style={styles.metricLabel}>{label}</div>
            <div style={styles.metricValue}>{value}</div>
            {description && <div style={styles.metricDesc}>{description}</div>}
        </div>
    );
}

export function ChartCard({ title, children, width = "100%" }) {
    return (
        <div style={{ ...styles.chartCard, width }}>
            <h3 style={styles.chartTitle}>{title}</h3>
            <div style={styles.chartContent}>{children}</div>
        </div>
    );
}

export function QuickStat({ label, value, description }) {
    return (
        <div style={styles.quickStat}>
            <div style={styles.quickStatValue}>{value}</div>
            <div style={styles.quickStatLabel}>{label}</div>
            <div style={styles.quickStatDesc}>{description}</div>
        </div>
    );
}

export function InfoPanel({ title, children }) {
    return (
        <div style={styles.infoPanel}>
            <h3 style={styles.infoPanelTitle}>{title}</h3>
            <div style={styles.infoPanelContent}>{children}</div>
        </div>
    );
}
