import useMinLoadTime from './useMinLoadTime';

/**
 * useRegionLoading – T1 / T2 region refresh.
 * Same contract as useMinLoadTime, default 250ms so a region shimmer
 * is always perceptible without stalling the page.
 */
export default function useRegionLoading(isLoading, minMs = 250) {
    return useMinLoadTime(isLoading, minMs);
}
