import React from 'react';
import { Sh, Circle, Row, Stack } from './atoms';
import { SkeletonStoryCard } from './storySkeletons';
import { SkeletonLeaderboard } from './widgetSkeletons';

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

export function SkeletonProfile() {
    return (
        <div style={{ minHeight: '100vh', background: 'transparent', padding: 20 }}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                {/* Back button */}
                <Sh w={160} h={13} style={{ marginBottom: 30 }} />

                {/* Profile header card */}
                <div
                    style={{
                        background: 'var(--glass-bg-strong)',
                        borderRadius: 'var(--radius-md)',
                        padding: 32,
                        boxShadow: 'var(--shadow-sm)',
                        marginBottom: 30,
                        border: '1px solid var(--border)',
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
                                background: 'var(--glass-bg-strong)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
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

export function SkeletonSettings() {
    return (
        <div style={{ minHeight: '100vh', background: 'transparent', padding: '20px' }}>
            <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                {/* Back button */}
                <Sh w={60} h={13} style={{ marginBottom: 30 }} />

                {/* Page title */}
                <Sh w={120} h={32} style={{ marginBottom: 8 }} />
                <Sh w={280} h={14} style={{ marginBottom: 30 }} />

                {/* Settings card */}
                <div style={{
                    background: 'var(--glass-bg-strong)',
                    borderRadius: 'var(--radius-md)',
                    padding: 28,
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--border)',
                }}>
                    {/* Section title */}
                    <Sh w={180} h={20} style={{ marginBottom: 24 }} />

                    {/* Toggle row: Calm Mode */}
                    <div style={{
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-md)',
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
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-md)',
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

export function SkeletonNotification() {
    return (
        <div
            style={{
                padding: '16px 20px',
                background: 'var(--glass-bg-strong)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
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

export function SkeletonNotifications() {
    return (
        <div style={{ minHeight: '100vh', background: 'transparent', padding: '20px' }}>
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
