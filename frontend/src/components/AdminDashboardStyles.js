// Admin Dashboard Styles - Matching CALM WRITER aesthetic with FIXED layout
const styles = {
    container: {
        fontFamily: 'var(--font-serif)',
        background: 'var(--glass-bg-strong)',
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    // Top Navigation - FIXED
    topNav: {
        background: 'var(--glass-bg-strong)',
        color: 'var(--text-primary)',
        padding: '0 24px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        zIndex: 10,
    },
    navLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    appTitle: {
        margin: 0,
        fontSize: '18px',
        fontWeight: 'normal',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-serif)',
    },
    navSeparator: {
        color: 'var(--text-tertiary)',
        fontSize: '18px',
    },
    navSection: {
        fontSize: '15px',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-serif)',
    },
    navRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    adminBadge: {
        background: 'var(--bg-subtle)',
        padding: '6px 14px',
        borderRadius: '4px',
        fontSize: '13px',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-serif)',
    },
    exitButton: {
        background: 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: 'var(--font-serif)',
        transition: 'background 0.2s',
    },

    // Main Layout - FIXED height, no overflow
    mainLayout: {
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        height: 'calc(100vh - 56px)',
        maxHeight: 'calc(100vh - 56px)',
    },

    // Sidebar - FIXED, scrollable if needed
    sidebar: {
        width: '220px',
        background: 'var(--glass-bg-strong)',
        borderRight: '1px solid var(--border)',
        padding: '20px 0',
        overflowY: 'auto',
        flexShrink: 0,
        height: '100%',
    },
    sidebarSection: {
        marginBottom: '24px',
    },
    sidebarTitle: {
        fontSize: '11px',
        fontWeight: 'bold',
        color: 'var(--text-tertiary)',
        padding: '0 20px',
        marginBottom: '8px',
        letterSpacing: '0.5px',
        fontFamily: 'var(--font-serif)',
    },
    tab: {
        width: '100%',
        padding: '10px 20px',
        background: 'transparent',
        border: 'none',
        borderLeft: '3px solid transparent',
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: '14px',
        color: 'var(--text-secondary)',
        transition: 'all 0.2s',
        fontFamily: 'var(--font-serif)',
    },
    tabActive: {
        width: '100%',
        padding: '10px 20px',
        background: 'var(--bg-subtle)',
        border: 'none',
        borderLeft: '3px solid var(--border)',
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: '14px',
        color: 'var(--text-primary)',
        fontWeight: 'bold',
        fontFamily: 'var(--font-serif)',
    },

    // Content Area - ONLY THIS SCROLLS
    contentArea: {
        flex: 1,
        background: 'var(--glass-bg-strong)',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '32px',
        height: '100%',
    },

    // Page Container
    pageContainer: {
        maxWidth: '1400px',
        margin: '0 auto',
    },
    pageHeader: {
        marginBottom: '32px',
    },
    pageTitle: {
        margin: '0 0 8px 0',
        fontSize: '26px',
        fontWeight: 'normal',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-serif)',
    },
    pageSubtitle: {
        margin: 0,
        fontSize: '14px',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-serif)',
    },

    // KPI Cards
    kpiRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '28px',
    },
    largeKPI: {
        background: 'var(--glass-bg-strong)',
        padding: '24px',
        borderRadius: 'var(--radius-md)',
        borderTop: '3px solid',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border)',
    },
    kpiHeader: {
        fontSize: '13px',
        color: 'var(--text-secondary)',
        marginBottom: '12px',
        fontFamily: 'var(--font-serif)',
    },
    kpiValue: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: 'var(--text-primary)',
        marginBottom: '8px',
        fontFamily: 'var(--font-serif)',
    },
    kpiSubtitle: {
        fontSize: '12px',
        color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-serif)',
    },
    kpiTrend: {
        fontSize: '13px',
        color: 'var(--text-secondary)',
        marginTop: '8px',
        fontFamily: 'var(--font-serif)',
    },

    // Metrics Grid
    metricsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
    },
    metricCard: {
        background: 'var(--glass-bg-strong)',
        padding: '20px',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'center',
        border: '1px solid var(--border)',
    },
    metricLabel: {
        fontSize: '12px',
        color: 'var(--text-secondary)',
        marginBottom: '8px',
        fontFamily: 'var(--font-serif)',
    },
    metricValue: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-serif)',
    },
    metricDesc: {
        fontSize: '11px',
        color: 'var(--text-tertiary)',
        marginTop: '4px',
        fontFamily: 'var(--font-serif)',
    },

    // Charts
    chartsRow: {
        display: 'flex',
        gap: '20px',
        marginBottom: '28px',
        flexWrap: 'wrap',
    },
    chartCard: {
        background: 'var(--glass-bg-strong)',
        padding: '24px',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        flex: 1,
        minWidth: '400px',
        border: '1px solid var(--border)',
    },
    chartTitle: {
        margin: '0 0 20px 0',
        fontSize: '16px',
        fontWeight: 'normal',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-serif)',
    },
    chartContent: {
        width: '100%',
    },

    // Activity Feed
    activityFeed: {
        maxHeight: '350px',
        overflowY: 'auto',
    },
    activityItem: {
        display: 'flex',
        gap: '12px',
        padding: '10px 0',
        borderBottom: '1px solid var(--border)',
    },
    activityDot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: 'var(--text-primary)',
        marginTop: '6px',
        flexShrink: 0,
    },
    activityContent: {
        flex: 1,
    },
    activityMessage: {
        fontSize: '13px',
        color: 'var(--text-primary)',
        marginBottom: '4px',
        fontFamily: 'var(--font-serif)',
    },
    activityTime: {
        fontSize: '11px',
        color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-serif)',
    },

    // Sections
    section: {
        marginBottom: '32px',
    },
    sectionTitle: {
        margin: '0 0 16px 0',
        fontSize: '18px',
        fontWeight: 'normal',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-serif)',
    },

    // Quick Stats
    quickStatsSection: {
        marginTop: '32px',
    },
    quickStatsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
    },
    quickStat: {
        background: 'var(--glass-bg-strong)',
        padding: '20px',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'center',
        border: '1px solid var(--border)',
    },
    quickStatValue: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: 'var(--text-primary)',
        marginBottom: '8px',
        fontFamily: 'var(--font-serif)',
    },
    quickStatLabel: {
        fontSize: '13px',
        color: 'var(--text-primary)',
        marginBottom: '4px',
        fontFamily: 'var(--font-serif)',
    },
    quickStatDesc: {
        fontSize: '11px',
        color: 'var(--text-tertiary)',
        fontFamily: 'var(--font-serif)',
    },

    // Info Panel
    infoPanel: {
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        marginTop: '24px',
    },
    infoPanelTitle: {
        margin: '0 0 16px 0',
        fontSize: '15px',
        fontWeight: 'normal',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-serif)',
    },
    infoPanelContent: {
        fontSize: '13px',
        color: 'var(--text-secondary)',
        lineHeight: '1.6',
        fontFamily: 'var(--font-serif)',
    },

    // Loading & Error States
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '20px',
    },
    loadingSpinner: {
        width: '40px',
        height: '40px',
        border: '3px solid var(--bg-subtle)',
        borderTop: '3px solid var(--text-primary)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    loadingText: {
        fontSize: '15px',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-serif)',
    },
    errorContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px',
    },
    errorText: {
        fontSize: '16px',
        color: 'var(--rose-dark)',
        fontFamily: 'var(--font-serif)',
    },
    retryButton: {
        padding: '10px 24px',
        background: 'var(--accent)',
        color: 'var(--accent-contrast)',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontFamily: 'var(--font-serif)',
    },
    backButton: {
        padding: '10px 24px',
        background: 'var(--bg-hover)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontFamily: 'var(--font-serif)',
    },
};

export default styles;
