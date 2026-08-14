import React from 'react';

export function Sh({ w = '100%', h = 14, r = 6, style = {} }) {
    return (
        <div
            className="skeleton-shimmer"
            style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }}
        />
    );
}

export function Circle({ size = 32 }) {
    return <Sh w={size} h={size} r="50%" style={{ flex: 'none' }} />;
}

export function Row({ gap = 10, align = 'center', children, style = {} }) {
    return (
        <div style={{ display: 'flex', gap, alignItems: align, ...style }}>
            {children}
        </div>
    );
}

export function Stack({ gap = 10, children, style = {} }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
            {children}
        </div>
    );
}

/** Full-page T0 wrapper — reserved height + a11y busy state. */
export function SkeletonPage({ children, className = '', style = {} }) {
    return (
        <div
            className={`page-shell ${className}`.trim()}
            role="status"
            aria-busy="true"
            aria-live="polite"
            style={style}
        >
            {children}
        </div>
    );
}
