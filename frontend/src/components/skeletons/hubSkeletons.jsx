import React from 'react';
import { Sh, Circle, Row, Stack } from './atoms';

/* ─────────────────────────────────────────────────────────────────
   THREAD VIEW SKELETON
   Mirrors: ThreadView.jsx
   ───────────────────────────────────────────────────────────────── */

export function SkeletonHubCard() {
    return (
        <div
            style={{
                padding: 20,
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 15,
                background: 'var(--glass-bg-strong)',
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

export function SkeletonHubsPage() {
    return (
        <div style={{ fontFamily: 'var(--font-serif)', background: 'transparent', minHeight: '100vh', padding: '20px' }}>
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
                <Row gap={10} style={{ marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
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

export function SkeletonHubDetail() {
    return (
        <div style={{ minHeight: '100vh', background: 'transparent' }}>
            <div style={{
                borderBottom: '1px solid var(--border)',
                background: 'var(--glass-bg-strong)',
                padding: 20,
            }}>
                <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                    <Sh w={140} h={14} style={{ marginBottom: 18 }} />
                    <Row gap={24} align="flex-start" style={{ justifyContent: 'space-between' }}>
                        <Stack gap={10} style={{ flex: 1 }}>
                            <Sh w="46%" h={30} />
                            <Sh w="78%" h={14} />
                            <Sh w="58%" h={14} />
                            <Row gap={8} style={{ marginTop: 6 }}>
                                <Sh w={72} h={24} r={12} />
                                <Sh w={64} h={24} r={12} />
                                <Sh w={56} h={24} r={12} />
                            </Row>
                        </Stack>
                        <Stack gap={8} style={{ alignItems: 'flex-end' }}>
                            <Sh w={130} h={40} r={6} />
                            <Sh w={110} h={12} />
                        </Stack>
                    </Row>
                </div>
            </div>
            <div style={{ background: 'var(--glass-bg-strong)', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
                <Row gap={20} style={{ maxWidth: 1000, margin: '0 auto', padding: '14px 0' }}>
                    <Sh w={60} h={16} />
                    <Sh w={70} h={16} />
                    <Sh w={48} h={16} />
                </Row>
            </div>
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
                <Sh w={110} h={38} r={6} style={{ marginBottom: 20 }} />
                <Stack gap={15}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{
                            padding: 20,
                            background: 'var(--glass-bg-strong)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                        }}>
                            <Sh w="40%" h={16} style={{ marginBottom: 10 }} />
                            <Sh w="100%" h={13} style={{ marginBottom: 6 }} />
                            <Sh w="70%" h={13} />
                        </div>
                    ))}
                </Stack>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   EDIT-REQUEST ROW
   ───────────────────────────────────────────────────────────────── */

export function SkeletonThreadView() {
    return (
        <div style={{ minHeight: '100vh', background: 'transparent', padding: '20px' }}>
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
