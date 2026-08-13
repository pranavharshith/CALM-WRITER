import React from 'react';
import { Sh, Circle, Row, Stack } from './atoms';

export function SkeletonStoryCard() {
    return (
        <div
            style={{
                background: 'var(--glass-bg-strong)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 24,
                boxShadow: 'var(--shadow-sm)',
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

export function SkeletonFeaturedBanner() {
    return (
        <div
            style={{
                background: 'var(--glass-bg-strong)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 32,
                marginBottom: 20,
                position: 'relative',
                boxShadow: 'var(--shadow-sm)',
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

export function SkeletonFeedPagination() {
    return (
        <div className="feed__load-more" aria-hidden="true" style={{ marginTop: 20 }}>
            <Stack gap={20}>
                <SkeletonStoryCard />
                <SkeletonStoryCard />
            </Stack>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   HUB DETAIL SKELETON
   Mirrors: HubDetail.jsx — header + tabs + content
   ───────────────────────────────────────────────────────────────── */

export function SkeletonStoryList({ count = 3 }) {
    return (
        <div style={{ minHeight: '100vh', background: 'transparent', padding: '20px' }}>
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

export function SkeletonStoryReader() {
    return (
        <div style={{ minHeight: '100vh', background: 'transparent', padding: 20 }}>
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
                        background: 'var(--glass-bg-strong)',
                        borderRadius: 'var(--radius-md)',
                        padding: 32,
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid var(--border)',
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
