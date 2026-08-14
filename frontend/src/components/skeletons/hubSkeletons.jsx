import React from 'react';
import { Sh, Row, Stack, SkeletonPage } from './atoms';

/* ─────────────────────────────────────────────────────────────────
   THREAD VIEW SKELETON
   Mirrors: ThreadView.jsx
   ───────────────────────────────────────────────────────────────── */

export function SkeletonHubCard() {
    return (
        <div className="hub-card hub-card--skeleton" aria-hidden="true">
            <div className="hub-card__top">
                <Sh w={40} h={40} r={14} />
                <Sh w={64} h={22} r={999} style={{ marginLeft: 'auto' }} />
            </div>
            <Sh w="62%" h={22} r={6} style={{ marginBottom: 8 }} />
            <Sh w="100%" h={12} style={{ marginBottom: 6 }} />
            <Sh w="78%" h={12} style={{ marginBottom: 16 }} />
            <div className="hub-card__chips">
                <Sh w={56} h={22} r={999} />
                <Sh w={48} h={22} r={999} />
            </div>
            <div className="hub-card__meta">
                <Sh w={72} h={12} r={4} />
                <Sh w={60} h={12} r={4} />
            </div>
        </div>
    );
}

export function SkeletonHubsGrid() {
    return (
        <div className="hubs-grid">
            {[1, 2, 3, 4].map((i) => <SkeletonHubCard key={i} />)}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   FOLLOWING ROW SKELETON
   ───────────────────────────────────────────────────────────────── */

export function SkeletonHubsPage() {
    return (
        <SkeletonPage>
            <div className="page-shell__inner page-shell__inner--wide hubs-page">
                <Sh w={72} h={14} r={4} />
                <div className="hubs-page__intro">
                    <Stack gap={10} style={{ flex: 1 }}>
                        <Sh w={160} h={32} r={6} />
                        <Sh w="46%" h={14} r={4} />
                    </Stack>
                </div>
                <Row gap={4} style={{ width: 'fit-content', padding: 4 }}>
                    <Sh w={88} h={44} r={999} />
                    <Sh w={96} h={44} r={999} />
                    <Sh w={80} h={44} r={999} />
                </Row>
                <SkeletonHubsGrid />
            </div>
        </SkeletonPage>
    );
}

/* ─────────────────────────────────────────────────────────────────
   NOTIFICATIONS PAGE SKELETON
   Mirrors: Notifications.jsx
   ───────────────────────────────────────────────────────────────── */

export function SkeletonHubDetail() {
    return (
        <SkeletonPage>
            <div className="page-shell__inner page-shell__inner--page hub-room">
                <Sh w={120} h={16} r={4} />
                <div className="hub-room__hero">
                    <Stack gap={12} style={{ flex: 1 }}>
                        <Row gap={16}>
                            <Sh w={52} h={52} r={14} />
                            <Sh w="42%" h={32} r={6} />
                        </Row>
                        <Sh w="78%" h={14} r={4} />
                        <Sh w="52%" h={14} r={4} />
                        <Row gap={8}>
                            <Sh w={72} h={22} r={999} />
                            <Sh w={64} h={22} r={999} />
                        </Row>
                    </Stack>
                    <Stack gap={8} style={{ alignItems: 'flex-end' }}>
                        <Sh w={64} h={28} r={6} />
                        <Sh w={110} h={40} r={999} />
                    </Stack>
                </div>
                <Row gap={4} style={{ width: 'fit-content', padding: 4 }}>
                    <Sh w={80} h={44} r={999} />
                    <Sh w={88} h={44} r={999} />
                    <Sh w={68} h={44} r={999} />
                </Row>
                <SkeletonHubStories />
            </div>
        </SkeletonPage>
    );
}

export function SkeletonHubStories() {
    return (
        <div className="hub-stories">
            <div className="hub-room__toolbar">
                <Sh w={110} h={44} r={999} />
            </div>
            {[1, 2, 3].map((i) => (
                <div key={i} className="hub-story hub-story--skeleton" aria-hidden="true">
                    <Sh w="40%" h={18} r={6} style={{ marginBottom: 10 }} />
                    <Sh w="100%" h={13} style={{ marginBottom: 6 }} />
                    <Sh w="70%" h={13} />
                </div>
            ))}
        </div>
    );
}

export function SkeletonHubMembers() {
    return (
        <div className="hub-people">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="hub-person" aria-hidden="true">
                    <Row gap={12}>
                        <Sh w={40} h={40} r={14} />
                        <Stack gap={6}>
                            <Sh w={140} h={14} />
                            <Sh w={90} h={12} />
                        </Stack>
                    </Row>
                    <Sh w={72} h={36} r={999} />
                </div>
            ))}
        </div>
    );
}

export function SkeletonHubChat() {
    return (
        <div className="hub-chat" aria-hidden="true">
            <div className="hub-chat__log">
                <Sh w="55%" h={36} r={8} />
                <Sh w="40%" h={36} r={8} style={{ alignSelf: 'flex-end' }} />
                <Sh w="62%" h={48} r={8} />
            </div>
            <div className="hub-chat__composer">
                <Sh w="100%" h={44} r={14} />
            </div>
        </div>
    );
}

export function SkeletonHubRequests() {
    return (
        <div className="hub-requests">
            {[1, 2, 3].map((i) => (
                <div key={i} className="hub-request" aria-hidden="true">
                    <Row gap={12}>
                        <Sh w={40} h={40} r={14} />
                        <Stack gap={6}>
                            <Sh w={120} h={14} />
                            <Sh w={80} h={12} />
                        </Stack>
                    </Row>
                    <Row gap={8}>
                        <Sh w={88} h={36} r={999} />
                        <Sh w={72} h={36} r={999} />
                    </Row>
                </div>
            ))}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   EDIT-REQUEST ROW
   ───────────────────────────────────────────────────────────────── */

export function SkeletonThreadView() {
    return (
        <SkeletonPage style={{ background: 'transparent', padding: '20px' }}>
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                {/* Back button */}
                <Sh w={120} h={13} style={{ marginBottom: 24 }} />

                {/* Main Story Card */}
                <div style={{
                    background: 'var(--glass-bg-strong)',
                    borderRadius: 'var(--radius-md)',
                    padding: 32,
                    boxShadow: 'var(--shadow-sm)',
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
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: 16,
                    }}>
                        <Sh w={120} h={12} style={{ marginBottom: 8 }} />
                        <Sh w="100%" h={13} style={{ marginBottom: 4 }} />
                        <Sh w="80%" h={13} />
                    </div>
                </Stack>
            </div>
        </SkeletonPage>
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
