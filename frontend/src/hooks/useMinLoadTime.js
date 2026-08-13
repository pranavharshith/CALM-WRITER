import { useState, useEffect, useRef } from 'react';

/**
 * useMinLoadTime – guarantees the skeleton is shown for at least `minMs`
 * milliseconds even when the actual fetch is faster.
 *
 * @param {boolean} isLoading – the "real" loading flag from your fetch call
 * @param {number}  minMs     – minimum display time in ms (default 650 — T0)
 * @returns {boolean}         – a derived loading flag that respects the minimum
 */
export default function useMinLoadTime(isLoading, minMs = 650) {
    const [show, setShow] = useState(isLoading);
    const timerRef = useRef(null);
    const startRef = useRef(isLoading ? Date.now() : null);

    useEffect(() => {
        if (isLoading) {
            // New load started — record start time and show skeleton immediately
            startRef.current = Date.now();
            setShow(true);
            return;
        }

        // Data arrived — wait until at least minMs has elapsed
        if (!startRef.current) {
            setShow(false);
            return;
        }

        const elapsed = Date.now() - startRef.current;
        const remaining = minMs - elapsed;

        if (remaining <= 0) {
            setShow(false);
            startRef.current = null;
        } else {
            timerRef.current = setTimeout(() => {
                setShow(false);
                startRef.current = null;
            }, remaining);
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isLoading, minMs]);

    return show;
}
