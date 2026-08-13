import React from 'react';
import { Sh, Circle, Row, Stack } from './atoms';

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

export function SkeletonLeaderboard() {
    return (
        <div
            style={{
                background: 'var(--glass-bg-strong)',
                borderRadius: 'var(--radius-md)',
                padding: 20,
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border)',
            }}
        >
            <Row style={{ justifyContent: 'space-between', marginBottom: 16 }}>
                <Sh w={110} h={17} />
                <Sh w={28} h={28} r="50%" />
            </Row>
            <Row gap={4} style={{ marginBottom: 20, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: 4 }}>
                {[44, 34, 38, 68].map((w, i) => (
                    <Sh key={i} w={w} h={28} r={4} />
                ))}
            </Row>
            <Sh w={100} h={11} style={{ marginBottom: 12 }} />
            <Stack gap={4}>
                {[1, 2, 3, 4, 5].map(i => <SkeletonLeaderboardRow key={i} />)}
            </Stack>
        </div>
    );
}

export function SkeletonFollowRow() {
    return (
        <div
            style={{
                padding: 20,
                background: 'var(--glass-bg-strong)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
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

/* ─────────────────────────────────────────────────────────────────
   FEED PAGINATION STUB (T2 — append only, never replaces)
   ───────────────────────────────────────────────────────────────── */

export function SkeletonEditRequestRow() {
    return (
        <div
            className="glass--strong"
            style={{
                padding: 16,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--glass-border)',
            }}
        >
            <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                <Sh w="42%" h={13} />
                <Sh w={70} h={22} r={12} />
            </Row>
            <Sh w="72%" h={12} style={{ marginBottom: 10 }} />
            <Sh w="50%" h={12} />
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   COMPACT WIDGET LINE (streak / onboarding / inline lists)
   ───────────────────────────────────────────────────────────────── */

export function SkeletonModerationCard() {
    return (
        <div
            style={{
                background: 'var(--glass-bg-strong)',
                borderRadius: 'var(--radius-md)',
                padding: 20,
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--border)',
            }}
        >
            <Row style={{ justifyContent: 'space-between', marginBottom: 14 }}>
                <Sh w={88} h={22} r={12} />
                <Sh w={72} h={12} />
            </Row>
            <Sh w="38%" h={13} style={{ marginBottom: 12 }} />
            <Stack gap={8}>
                <Sh w="100%" h={13} />
                <Sh w="86%" h={13} />
                <Sh w="54%" h={13} />
            </Stack>
            <Row gap={8} style={{ marginTop: 16 }}>
                <Sh w={90} h={32} r={8} />
                <Sh w={80} h={32} r={8} />
            </Row>
        </div>
    );
}

export function SkeletonWidgetLine() {
    return (
        <div className="glass" style={{ padding: 16, borderRadius: 'var(--radius-lg)' }}>
            <Row gap={12}>
                <Circle size={40} />
                <Stack gap={8} style={{ flex: 1 }}>
                    <Sh w="55%" h={13} />
                    <Sh w="80%" h={11} />
                </Stack>
            </Row>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────
   REGION WRAPPER — T1/T2 crossfade, reserved height, aria-busy
   ───────────────────────────────────────────────────────────────── */

export function SkeletonRegion({
    loading,
    minHeight = 200,
    skeleton,
    children,
    className = '',
}) {
    return (
        <div
            className={`skeleton-region${loading ? ' region--loading' : ''}${className ? ` ${className}` : ''}`}
            aria-busy={loading || undefined}
            style={{ minHeight }}
        >
            {loading ? skeleton : children}
        </div>
    );
}
