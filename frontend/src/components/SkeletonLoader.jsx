import React from 'react';

/* ─────────────────────────────────────────────────────────────────
   DESIGN NOTE
   Every skeleton component here mirrors its real counterpart 1-to-1:
   same heights, same padding, same gap — so the layout never shifts
   when real content appears.
   All boxes use the .skeleton-shimmer shimmer animation.
   ───────────────────────────────────────────────────────────────── */

/* ── Base atoms ── */
function Sh({ w = '100%', h = 14, r = 6, style = {} }) {
    return (
        <div
            className="skeleton-shimmer"
            style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }}
        />
    );
}

function Circle({ size = 32 }) {
    return <Sh w={size} h={size} r="50%" style={{ flex: 'none' }} />;
}

function Row({ gap = 10, align = 'center', children, style = {} }) {
    return (
        <div style={{ display: 'flex', gap, alignItems: align, ...style }}>
            {children}
        </div>
    );
}

function Stack({ gap = 10, children, style = {} }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
            {children}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   STORY CARD SKELETON
   Mirrors: StoryCard.jsx  (.story-card)
   ───────────────────────────────────────────────────────────────── */
export function SkeletonStoryCard() {
    return (
        <div
            style={{
                background: '#fff',
                border: '1px solid #e0e0de',
                borderRadius: 8,
                padding: 24,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
        >
            {/* Header: avatar + username + timestamp | action buttons */}
            <Row gap={12} style={{ justifyContent: 'space-between', marginBottom: 16 }}>
                <Row gap={12}>
                    <Circle size={32} />
                    <Sh w={90} h={12} />
                    <Sh w={48} h={10} />
                </Row>
                <Row gap={6}>
                    <Sh w={30} h={30} r="50%" />
                    <Sh w={30} h={30} r="50%" />
                    <Sh w={30} h={30} r="50%" />
                    <Sh w={50} h={30} r={20} />
                </Row>
            </Row>

            {/* Title */}
            <Sh w="72%" h={20} style={{ marginBottom: 14 }} />

            {/* Preview text */}
            <Stack gap={8}>
                <Sh w="100%" h={13} />
                <Sh w="94%" h={13} />
                <Sh w="62%" h={13} />
            </Stack>

            {/* "Read full story →" */}
            <Sh w={130} h={11} style={{ marginTop: 16 }} />
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   LEADERBOARD ROW SKELETON
   Mirrors: Leaderboard.jsx .leaderboard__row
   ───────────────────────────────────────────────────────────────── */
export function SkeletonLeaderboardRow() {
    return (
        <Row gap={8} style={{ padding: 8 }}>
            <Sh w={20} h={13} />
            <div style={{ flex: 1 }}>
                <Sh w="82%" h={12} style={{ marginBottom: 5 }} />
                <Sh w="50%" h={10} />
            </div>
            <Sh w={32} h={12} />
        </Row>
    );
}

/* ─────────────────────────────────────────────────────────────────
   LEADERBOARD PANEL SKELETON
   Mirrors: Leaderboard.jsx full widget  (.leaderboard)
   ───────────────────────────────────────────────────────────────── */
export function SkeletonLeaderboard() {
    return (
        <div
            style={{
                background: '#fff',
                borderRadius: 8,
                padding: 20,
                boxShadow: '0 1px 4px #efefee',
                border: '1px solid #e0e0de',
            }}
        >
            {/* Title row */}
            <Row style={{ justifyContent: 'space-between', marginBottom: 16 }}>
                <Sh w={110} h={17} />
                <Sh w={28} h={28} r="50%" />
            </Row>

            {/* Tab bar */}
            <Row gap={4} style={{ marginBottom: 20, background: '#f8f9fa', borderRadius: 4, padding: 4 }}>
                {[44, 34, 38, 68].map((w, i) => (
                    <Sh key={i} w={w} h={28} r={4} />
                ))}
            </Row>

            {/* Period label */}
            <Sh w={100} h={11} style={{ marginBottom: 12 }} />

            {/* 5 rows */}
            <Stack gap={4}>
                {[1, 2, 3, 4, 5].map(i => <SkeletonLeaderboardRow key={i} />)}
            </Stack>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   FULL COMMUNITY FEED SKELETON
   Mirrors: CommunityFeed.jsx — entire page layout
   (sticky header + main column + sidebar)
   ───────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────
   FULL COMMUNITY FEED SKELETON
   Mirrors: CommunityFeed.jsx — entire page layout
   Uses global .feed CSS classes to match responsive behavior
   ───────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────
   FEATURED BANNER SKELETON
   Mirrors: FeaturedBanner.jsx
   ───────────────────────────────────────────────────────────────── */
export function SkeletonFeaturedBanner() {
    return (
        <div
            style={{
                background: '#fff',
                border: '1px solid #e0e0de',
                borderRadius: 12,
                padding: 32,
                marginBottom: 20,
                position: 'relative',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                overflow: 'hidden'
            }}
        >
            {/* Featured Badge (Top Right) */}
            <div style={{ position: 'absolute', top: 16, right: 16 }}>
                <Sh w={100} h={24} r={12} />
            </div>

            {/* Content Container (padding for badge space) */}
            <div style={{ marginRight: 120 }}>
                {/* Author line */}
                <Sh w={180} h={14} style={{ marginBottom: 12 }} />

                {/* Title */}
                <Sh w="60%" h={28} style={{ marginBottom: 16 }} />

                {/* Text body (3 lines) */}
                <Stack gap={10} style={{ marginBottom: 20 }}>
                    <Sh w="95%" h={14} />
                    <Sh w="90%" h={14} />
                    <Sh w="40%" h={14} />
                </Stack>

                {/* Footer (Likes + Read more) */}
                <Row gap={16}>
                    <Sh w={80} h={14} />
                    <Sh w={100} h={14} />
                </Row>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   FULL COMMUNITY FEED SKELETON
   Mirrors: CommunityFeed.jsx — entire page layout
   Uses global .feed CSS classes to match responsive behavior
   ───────────────────────────────────────────────────────────────── */
export function AppSplashSkeleton() {
    return (
        <div className="feed">
            {/* Sticky Header */}
            <div className="feed__header">
                <div className="feed__header-inner">
                    {/* Logo */}
                    <Sh w={120} h={28} />

                    {/* Nav */}
                    <div className="feed__nav">
                        <Sh w={70} h={36} r={4} /> {/* Write */}
                        <Sh w={100} h={36} r={4} /> {/* Profile */}
                        <Sh w={60} h={36} r={4} /> {/* Hubs */}
                        <Sh w={80} h={36} r={4} /> {/* Settings */}
                        <Sh w={40} h={36} r={4} /> {/* Notif */}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="feed__body">
                {/* Main Content */}
                <div className="feed__main">
                    {/* Search Placeholder */}
                    <Sh w="100%" h={42} r={4} style={{ marginBottom: 32 }} />

                    {/* Sort Tabs */}
                    <Row gap={12} style={{ marginBottom: 32 }}>
                        <Sh w={70} h={36} r={4} />
                        <Sh w={80} h={36} r={4} />
                        <Sh w={90} h={36} r={4} />
                    </Row>

                    {/* Stories List - No Featured Banner */}
                    <Stack gap={20}>
                        {[1, 2, 3, 4, 5].map(i => <SkeletonStoryCard key={i} />)}
                    </Stack>
                </div>

                {/* Sidebar */}
                <div className="feed__sidebar">
                    <div className="feed__sidebar-sticky">
                        <SkeletonLeaderboard />
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   STORY READER SKELETON
   Mirrors: StoryReader.jsx — full page
   ───────────────────────────────────────────────────────────────── */
export function SkeletonStoryReader() {
    return (
        <div style={{ minHeight: '100vh', background: '#fefefd', padding: 20 }}>
            <div style={{ maxWidth: 660, margin: '0 auto' }}>
                {/* Top bar */}
                <Row style={{ justifyContent: 'space-between', marginBottom: 20 }}>
                    <Sh w={70} h={14} />
                    <Row gap={8}>
                        <Sh w={36} h={36} r="50%" />
                        <Sh w={36} h={36} r="50%" />
                        <Sh w={36} h={36} r="50%" />
                        <Sh w={64} h={36} r={20} />
                        <Sh w={110} h={36} r={6} />
                    </Row>
                </Row>

                {/* Content box */}
                <div
                    style={{
                        background: '#fff',
                        borderRadius: 8,
                        padding: 32,
                        boxShadow: '0 1px 8px #efefee',
                        border: '1px solid #e0e0de',
                    }}
                >
                    {/* Progress bar */}
                    <Sh w="100%" h={4} r={2} style={{ marginBottom: 28 }} />

                    {/* Story title */}
                    <Sh w="78%" h={30} style={{ marginBottom: 10 }} />
                    <Sh w="52%" h={30} style={{ marginBottom: 32 }} />

                    {/* Body paragraphs — 3 paragraphs */}
                    <Stack gap={10} style={{ marginBottom: 28 }}>
                        <Sh w="100%" h={14} />
                        <Sh w="97%" h={14} />
                        <Sh w="88%" h={14} />
                        <Sh w="100%" h={14} />
                        <Sh w="91%" h={14} />
                        <Sh w="0" h={14} style={{ margin: '4px 0' }} /> {/* paragraph gap */}
                        <Sh w="100%" h={14} />
                        <Sh w="95%" h={14} />
                        <Sh w="72%" h={14} />
                        <Sh w="100%" h={14} />
                        <Sh w="84%" h={14} />
                        <Sh w="0" h={14} style={{ margin: '4px 0' }} />
                        <Sh w="100%" h={14} />
                        <Sh w="96%" h={14} />
                        <Sh w="60%" h={14} />
                    </Stack>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   PROFILE PAGE SKELETON
   Mirrors: UserProfile.jsx — entire page
   ───────────────────────────────────────────────────────────────── */
export function SkeletonProfile() {
    return (
        <div style={{ minHeight: '100vh', background: '#fefefd', padding: 20 }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                {/* Back button */}
                <Sh w={160} h={13} style={{ marginBottom: 30 }} />

                {/* Profile header card */}
                <div
                    style={{
                        background: '#fff',
                        borderRadius: 8,
                        padding: 32,
                        boxShadow: '0 1px 4px #efefee',
                        marginBottom: 30,
                        border: '1px solid #e0e0de',
                    }}
                >
                    <Row gap={24} align="flex-start" style={{ marginBottom: 20 }}>
                        {/* Avatar */}
                        <Circle size={100} />
                        {/* Info */}
                        <Stack gap={12} style={{ flex: 1 }}>
                            <Sh w={220} h={30} />
                            <Sh w={150} h={17} />
                            <Row gap={20}>
                                <Sh w={70} h={12} />
                                <Sh w={90} h={12} />
                                <Sh w={110} h={12} />
                            </Row>
                        </Stack>
                    </Row>
                    <Sh w={110} h={38} r={6} />
                </div>

                {/* Content section */}
                <Stack gap={4} style={{ marginBottom: 8 }}>
                    <Sh w={80} h={20} style={{ marginBottom: 16 }} />
                    {[1, 2, 3].map(i => (
                        <div
                            key={i}
                            style={{
                                background: '#fff',
                                border: '1px solid #e0e0de',
                                borderRadius: 8,
                                padding: 20,
                            }}
                        >
                            <Sh w="60%" h={14} />
                        </div>
                    ))}
                </Stack>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   NOTIFICATION ROW SKELETON
   ───────────────────────────────────────────────────────────────── */
export function SkeletonNotification() {
    return (
        <div
            style={{
                padding: '16px 20px',
                background: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
            }}
        >
            <Circle size={36} />
            <Stack gap={8} style={{ flex: 1 }}>
                <Sh w="70%" h={13} />
                <Sh w="40%" h={11} />
            </Stack>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   HUB CARD SKELETON
   ───────────────────────────────────────────────────────────────── */
export function SkeletonHubCard() {
    return (
        <div
            style={{
                padding: 20,
                border: '1px solid #e0e0e0',
                borderRadius: 4,
                marginBottom: 15,
                background: '#fff',
            }}
        >
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Stack gap={8} style={{ flex: 1 }}>
                    <Sh w="50%" h={18} style={{ marginBottom: 2 }} />
                    <Sh w="90%" h={12} />
                    <Sh w="70%" h={12} style={{ marginBottom: 6 }} />
                    <Row gap={8}>
                        <Sh w={60} h={22} r={12} />
                        <Sh w={70} h={22} r={12} />
                        <Sh w={55} h={22} r={12} />
                    </Row>
                </Stack>
                <Stack gap={6} align="flex-end" style={{ minWidth: 80, alignItems: 'flex-end' }}>
                    <Sh w={70} h={12} />
                    <Sh w={55} h={11} />
                </Stack>
            </Row>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   FOLLOWING ROW SKELETON
   ───────────────────────────────────────────────────────────────── */
export function SkeletonFollowRow() {
    return (
        <div
            style={{
                padding: 20,
                background: '#fff',
                border: '1px solid #e0e0de',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
            }}
        >
            <Sh w={110} h={16} />
            <Sh w={80} h={12} />
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   FEED CARDS ONLY (used for pagination / sort-switch shimmers inside feed)
   ───────────────────────────────────────────────────────────────── */
export function SkeletonFeedCards({ count = 5 }) {
    return (
        <Stack gap={20}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonStoryCard key={i} />
            ))}
        </Stack>
    );
}

/* ─────────────────────────────────────────────────────────────────
   SETTINGS PAGE SKELETON
   Mirrors: Settings.jsx — full page
   ───────────────────────────────────────────────────────────────── */
export function SkeletonSettings() {
    return (
        <div style={{ minHeight: '100vh', background: '#fefefd', padding: '20px' }}>
            <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                {/* Back button */}
                <Sh w={60} h={13} style={{ marginBottom: 30 }} />

                {/* Page title */}
                <Sh w={120} h={32} style={{ marginBottom: 8 }} />
                <Sh w={280} h={14} style={{ marginBottom: 30 }} />

                {/* Settings card */}
                <div style={{
                    background: '#fff',
                    borderRadius: 8,
                    padding: 28,
                    boxShadow: '0 1px 4px #efefee',
                    border: '1px solid #e0e0de',
                }}>
                    {/* Section title */}
                    <Sh w={180} h={20} style={{ marginBottom: 24 }} />

                    {/* Toggle row: Calm Mode */}
                    <div style={{
                        background: '#f8f9fa',
                        borderRadius: 6,
                        padding: 16,
                        marginBottom: 20,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <Stack gap={6} style={{ flex: 1 }}>
                            <Sh w={100} h={14} />
                            <Sh w={260} h={11} />
                        </Stack>
                        <Sh w={44} h={24} r={12} style={{ flexShrink: 0 }} />
                    </div>

                    {/* Language select */}
                    <Stack gap={8} style={{ marginBottom: 20 }}>
                        <Sh w={230} h={13} />
                        <Sh w="100%" h={38} r={4} />
                    </Stack>

                    {/* Font size */}
                    <Stack gap={8} style={{ marginBottom: 20 }}>
                        <Sh w={80} h={13} />
                        <Row gap={8}>
                            <Sh w={60} h={34} r={4} />
                            <Sh w={70} h={34} r={4} />
                            <Sh w={55} h={34} r={4} />
                        </Row>
                    </Stack>

                    {/* Toggle row: Auto-Scroll */}
                    <div style={{
                        background: '#f8f9fa',
                        borderRadius: 6,
                        padding: 16,
                        marginBottom: 28,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <Stack gap={6} style={{ flex: 1 }}>
                            <Sh w={90} h={14} />
                            <Sh w={300} h={11} />
                        </Stack>
                        <Sh w={44} h={24} r={12} style={{ flexShrink: 0 }} />
                    </div>

                    {/* Save button */}
                    <Sh w={130} h={40} r={6} />
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   STORY LIST SKELETON
   Mirrors: MyStories.jsx / UserStories.jsx
   ───────────────────────────────────────────────────────────────── */
export function SkeletonStoryList({ count = 3 }) {
    return (
        <div style={{ minHeight: '100vh', background: '#fefefd', padding: '20px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* Back button */}
                <Sh w={130} h={13} style={{ marginBottom: 30 }} />

                {/* Page title */}
                <Sh w={200} h={32} style={{ marginBottom: 30 }} />

                {/* Story cards */}
                <Stack gap={20}>
                    {Array.from({ length: count }).map((_, i) => (
                        <SkeletonStoryCard key={i} />
                    ))}
                </Stack>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   HUBS PAGE SKELETON
   Mirrors: CollaborativeHubs.jsx — full page initial load
   ───────────────────────────────────────────────────────────────── */
export function SkeletonHubsPage() {
    return (
        <div style={{ fontFamily: 'Georgia, serif', background: '#fefefd', minHeight: '100vh', padding: '20px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', marginBottom: '30px' }}>
                {/* Header row: back + title */}
                <Row gap={15} style={{ marginBottom: 20 }}>
                    <Sh w={36} h={36} r={4} />
                    <Sh w={220} h={28} />
                </Row>

                {/* Description */}
                <Sh w="80%" h={14} style={{ marginBottom: 6 }} />
                <Sh w="60%" h={14} style={{ marginBottom: 24 }} />

                {/* Tab bar */}
                <Row gap={10} style={{ marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid #e0e0e0' }}>
                    <Sh w={70} h={34} r={4} />
                    <Sh w={75} h={34} r={4} />
                    <Sh w={65} h={34} r={4} />
                </Row>

                {/* Filter row */}
                <Row gap={10} style={{ marginBottom: 20 }}>
                    <Sh w={160} h={38} r={4} />
                    <div style={{ flex: 1 }} />
                    <Sh w={110} h={38} r={4} />
                </Row>
            </div>

            {/* Hub cards */}
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {[1, 2, 3, 4].map(i => <SkeletonHubCard key={i} />)}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   NOTIFICATIONS PAGE SKELETON
   Mirrors: Notifications.jsx
   ───────────────────────────────────────────────────────────────── */
export function SkeletonNotifications() {
    return (
        <div style={{ minHeight: '100vh', background: '#fefefd', padding: '20px' }}>
            <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                {/* Back button */}
                <Sh w={130} h={13} style={{ marginBottom: 24 }} />

                {/* Title + Mark all read button */}
                <Row style={{ justifyContent: 'space-between', marginBottom: 24 }}>
                    <Sh w={180} h={32} />
                    <Sh w={100} h={13} />
                </Row>

                {/* List of notifications */}
                <Stack gap={12}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <SkeletonNotification key={i} />
                    ))}
                </Stack>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   THREAD VIEW SKELETON
   Mirrors: ThreadView.jsx
   ───────────────────────────────────────────────────────────────── */
export function SkeletonThreadView() {
    return (
        <div style={{ minHeight: '100vh', background: '#fefefd', padding: '20px' }}>
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                {/* Back button */}
                <Sh w={120} h={13} style={{ marginBottom: 24 }} />

                {/* Main Story Card */}
                <div style={{
                    background: '#fff',
                    borderRadius: 8,
                    padding: 32,
                    boxShadow: '0 1px 8px #efefee',
                    marginBottom: 24
                }}>
                    {/* Author line */}
                    <Row gap={8} style={{ marginBottom: 16 }}>
                        <Sh w={100} h={12} />
                    </Row>

                    {/* Title */}
                    <Sh w="60%" h={24} style={{ marginBottom: 16 }} />

                    {/* Content */}
                    <Stack gap={10} style={{ marginBottom: 16 }}>
                        <Sh w="100%" h={14} />
                        <Sh w="98%" h={14} />
                        <Sh w="95%" h={14} />
                        <Sh w="40%" h={14} />
                    </Stack>

                    {/* Footer actions */}
                    <Sh w={50} h={12} />
                </div>

                {/* Continuation/Responses placeholder */}
                <Stack gap={16}>
                    <Sh w={140} h={14} />
                    <div style={{
                        background: '#fafafa',
                        borderRadius: 6,
                        padding: 16,
                    }}>
                        <Sh w={120} h={12} style={{ marginBottom: 8 }} />
                        <Sh w="100%" h={13} style={{ marginBottom: 4 }} />
                        <Sh w="80%" h={13} />
                    </div>
                </Stack>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   WRITE SCREEN SKELETON
   Mirrors: WriteScreen.jsx
   ───────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────
   WRITE SCREEN SKELETON
   Mirrors: WriteScreen.jsx
   ───────────────────────────────────────────────────────────────── */
export function SkeletonWriteScreen() {
    return (
        <div className="write-screen">
            <div className="write-screen__inner">
                {/* Top bar */}
                <div className="write-screen__topbar">
                    <Sh w={80} h={36} r={4} /> {/* Back btn */}
                    <div className="write-screen__topbar-actions" style={{ display: 'flex', gap: 12 }}>
                        <Sh w={110} h={36} r={4} /> {/* My Drafts */}
                        <Sh w={100} h={36} r={4} /> {/* New Draft */}
                    </div>
                </div>

                {/* Title Input */}
                <div style={{ marginBottom: 24, marginTop: 24 }}>
                    <Sh w={240} h={14} style={{ marginBottom: 12 }} /> {/* Label */}
                    <Sh w="100%" h={50} r={4} /> {/* Input */}
                </div>

                {/* Body Textarea */}
                <Sh w="100%" h={400} r={4} style={{ marginBottom: 20 }} />

                {/* Footer */}
                <div className="write-screen__footer">
                    <Sh w={120} h={14} /> {/* Word count */}
                    <Sh w={100} h={44} r={6} /> {/* Publish btn */}
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   ANALYTICS / STATS PAGE SKELETON
   Mirrors: AnalyticsDashboard.jsx
   ───────────────────────────────────────────────────────────────── */

export function SkeletonAnalyticsRow() {
    return (
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: '16px 24px' }}>
                <Sh w="60%" h={20} style={{ marginBottom: 8 }} />
                <Sh w="30%" h={12} />
            </td>
            <td style={{ padding: '16px 24px' }}>
                <Sh w={80} h={20} />
            </td>
            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Sh w={40} h={20} />
                </div>
            </td>
            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Sh w={40} h={20} />
                </div>
            </td>
            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Sh w={40} h={20} />
                </div>
            </td>
        </tr>
    );
}

export function SkeletonAnalyticsDashboard() {
    return (
        <div className="container">
            {/* Header */}
            <div className="flex-between mb-6" style={{ marginTop: '20px' }}>
                <div>
                    <Sh w={80} h={16} style={{ marginBottom: 12 }} />
                    <Sh w={200} h={32} />
                </div>
                <Sh w={100} h={14} />
            </div>

            {/* Summary Cards */}
            <div className="flex gap-4 mb-8" style={{ flexWrap: 'wrap' }}>
                {[1, 2, 3].map(i => (
                    <div key={i} className="card p-4" style={{ flex: '1', minWidth: '200px', padding: '24px' }}>
                        <Sh w={100} h={14} style={{ marginBottom: 8 }} />
                        <Sh w={60} h={36} />
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="card mb-8" style={{ padding: '24px' }}>
                <Sh w={200} h={24} style={{ marginBottom: 24 }} />
                <Sh w="100%" h={300} />
            </div>

            {/* Stories Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                    <Sh w={150} h={24} />
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '12px 24px', textAlign: 'left' }}><Sh w={50} h={12} /></th>
                                <th style={{ padding: '12px 24px', textAlign: 'left' }}><Sh w={50} h={12} /></th>
                                <th style={{ padding: '12px 24px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Sh w={50} h={12} /></div>
                                </th>
                                <th style={{ padding: '12px 24px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Sh w={50} h={12} /></div>
                                </th>
                                <th style={{ padding: '12px 24px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Sh w={50} h={12} /></div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3].map(i => <SkeletonAnalyticsRow key={i} />)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

