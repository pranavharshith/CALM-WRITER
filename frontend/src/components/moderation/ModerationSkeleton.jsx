import React from 'react';
import { SkeletonModerationCard } from '../SkeletonLoader';

export default function ModerationSkeleton({ count = 3 }) {
    return (
        <div
            className="skeleton-region region--loading"
            style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 360 }}
            aria-busy="true"
        >
            {Array.from({ length: count }).map((_, i) => <SkeletonModerationCard key={i} />)}
        </div>
    );
}
