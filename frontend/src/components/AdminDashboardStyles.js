// Admin Dashboard Styles - Matching CALM WRITER aesthetic with FIXED layout
const styles = {
    container: {
        fontFamily: 'Georgia, serif',
        background: '#fefefd',
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
        background: '#fff',
        color: '#333',
        padding: '0 24px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #ddd',
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
        color: '#333',
        fontFamily: 'Georgia, serif',
    },
    navSeparator: {
        color: '#999',
        fontSize: '18px',
    },
    navSection: {
        fontSize: '15px',
        color: '#666',
        fontFamily: 'Georgia, serif',
    },
    navRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    adminBadge: {
        background: '#f0f0f0',
        padding: '6px 14px',
        borderRadius: '4px',
        fontSize: '13px',
        color: '#333',
        fontFamily: 'Georgia, serif',
    },
    exitButton: {
        background: 'transparent',
        border: '1px solid #ddd',
        color: '#333',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '13px',
        fontFamily: 'Georgia, serif',
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
        background: '#fff',
        borderRight: '1px solid #ddd',
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
        color: '#999',
        padding: '0 20px',
        marginBottom: '8px',
        letterSpacing: '0.5px',
        fontFamily: 'Georgia, serif',
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
        color: '#666',
        transition: 'all 0.2s',
        fontFamily: 'Georgia, serif',
    },
    tabActive: {
        width: '100%',
        padding: '10px 20px',
        background: '#f8f8f8',
        border: 'none',
        borderLeft: '3px solid #333',
        textAlign: 'left',
        cursor: 'pointer',
        fontSize: '14px',
        color: '#333',
        fontWeight: 'bold',
        fontFamily: 'Georgia, serif',
    },

    // Content Area - ONLY THIS SCROLLS
    contentArea: {
        flex: 1,
        background: '#fefefd',
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
        color: '#333',
        fontFamily: 'Georgia, serif',
    },
    pageSubtitle: {
        margin: 0,
        fontSize: '14px',
        color: '#666',
        fontFamily: 'Georgia, serif',
    },

    // KPI Cards
    kpiRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '28px',
    },
    largeKPI: {
        background: 'white',
        padding: '24px',
        borderRadius: '6px',
        borderTop: '3px solid',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #e8e8e8',
    },
    kpiHeader: {
        fontSize: '13px',
        color: '#666',
        marginBottom: '12px',
        fontFamily: 'Georgia, serif',
    },
    kpiValue: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '8px',
        fontFamily: 'Georgia, serif',
    },
    kpiSubtitle: {
        fontSize: '12px',
        color: '#999',
        fontFamily: 'Georgia, serif',
    },
    kpiTrend: {
        fontSize: '13px',
        color: '#666',
        marginTop: '8px',
        fontFamily: 'Georgia, serif',
    },

    // Metrics Grid
    metricsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
    },
    metricCard: {
        background: 'white',
        padding: '20px',
        borderRadius: '6px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        textAlign: 'center',
        border: '1px solid #e8e8e8',
    },
    metricLabel: {
        fontSize: '12px',
        color: '#666',
        marginBottom: '8px',
        fontFamily: 'Georgia, serif',
    },
    metricValue: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'Georgia, serif',
    },
    metricDesc: {
        fontSize: '11px',
        color: '#999',
        marginTop: '4px',
        fontFamily: 'Georgia, serif',
    },

    // Charts
    chartsRow: {
        display: 'flex',
        gap: '20px',
        marginBottom: '28px',
        flexWrap: 'wrap',
    },
    chartCard: {
        background: 'white',
        padding: '24px',
        borderRadius: '6px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        flex: 1,
        minWidth: '400px',
        border: '1px solid #e8e8e8',
    },
    chartTitle: {
        margin: '0 0 20px 0',
        fontSize: '16px',
        fontWeight: 'normal',
        color: '#333',
        fontFamily: 'Georgia, serif',
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
        borderBottom: '1px solid #f0f0f0',
    },
    activityDot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: '#333',
        marginTop: '6px',
        flexShrink: 0,
    },
    activityContent: {
        flex: 1,
    },
    activityMessage: {
        fontSize: '13px',
        color: '#333',
        marginBottom: '4px',
        fontFamily: 'Georgia, serif',
    },
    activityTime: {
        fontSize: '11px',
        color: '#999',
        fontFamily: 'Georgia, serif',
    },

    // Sections
    section: {
        marginBottom: '32px',
    },
    sectionTitle: {
        margin: '0 0 16px 0',
        fontSize: '18px',
        fontWeight: 'normal',
        color: '#333',
        fontFamily: 'Georgia, serif',
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
        background: 'white',
        padding: '20px',
        borderRadius: '6px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        textAlign: 'center',
        border: '1px solid #e8e8e8',
    },
    quickStatValue: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#333',
        marginBottom: '8px',
        fontFamily: 'Georgia, serif',
    },
    quickStatLabel: {
        fontSize: '13px',
        color: '#333',
        marginBottom: '4px',
        fontFamily: 'Georgia, serif',
    },
    quickStatDesc: {
        fontSize: '11px',
        color: '#999',
        fontFamily: 'Georgia, serif',
    },

    // Info Panel
    infoPanel: {
        background: '#f8f9fa',
        border: '1px solid #e0e0e0',
        borderRadius: '6px',
        padding: '20px',
        marginTop: '24px',
    },
    infoPanelTitle: {
        margin: '0 0 16px 0',
        fontSize: '15px',
        fontWeight: 'normal',
        color: '#333',
        fontFamily: 'Georgia, serif',
    },
    infoPanelContent: {
        fontSize: '13px',
        color: '#555',
        lineHeight: '1.6',
        fontFamily: 'Georgia, serif',
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
        border: '3px solid #f0f0f0',
        borderTop: '3px solid #333',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    loadingText: {
        fontSize: '15px',
        color: '#666',
        fontFamily: 'Georgia, serif',
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
        color: '#d44',
        fontFamily: 'Georgia, serif',
    },
    retryButton: {
        padding: '10px 24px',
        background: '#333',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
    },
    backButton: {
        padding: '10px 24px',
        background: '#666',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        fontFamily: 'Georgia, serif',
    },
};

export default styles;
