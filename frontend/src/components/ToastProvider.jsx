import React, { createContext, useCallback, useMemo, useRef, useState } from 'react';

export const ToastContext = createContext(null);

const LIFE_MS = 3500;
const EXIT_MS = 180;

let nextId = 1;

export default function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timers = useRef(new Map());

    const remove = useCallback((id) => {
        const existing = timers.current.get(id);
        if (existing) {
            clearTimeout(existing.life);
            clearTimeout(existing.exit);
            timers.current.delete(id);
        }
        setToasts((list) => list.filter((t) => t.id !== id));
    }, []);

    const beginExit = useCallback((id) => {
        setToasts((list) =>
            list.map((t) => (t.id === id ? { ...t, leaving: true } : t))
        );
        const handle = setTimeout(() => remove(id), EXIT_MS);
        const prev = timers.current.get(id) || {};
        timers.current.set(id, { ...prev, exit: handle });
    }, [remove]);

    const push = useCallback((type, message) => {
        if (!message) return;
        const id = nextId++;
        setToasts((list) => [...list, { id, type, message, leaving: false }]);
        const life = setTimeout(() => beginExit(id), LIFE_MS);
        timers.current.set(id, { life, exit: null });
    }, [beginExit]);

    const api = useMemo(() => ({
        success: (message) => push('success', message),
        error: (message) => push('error', message),
        info: (message) => push('info', message),
        dismiss: beginExit,
    }), [push, beginExit]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="toast-stack" aria-live="polite" aria-relevant="additions">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`toast toast--${t.type}${t.leaving ? ' toast--leaving' : ''}`}
                        role="status"
                    >
                        <span className="toast__message">{t.message}</span>
                        <button
                            type="button"
                            className="toast__dismiss"
                            onClick={() => beginExit(t.id)}
                            aria-label="Dismiss notification"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
