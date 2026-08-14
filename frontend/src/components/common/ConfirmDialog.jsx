import React, { useEffect, useRef } from 'react';

/**
 * Styled glass confirmation. Replaces native confirm() on destructive paths.
 *
 *   <ConfirmDialog
 *     open={open}
 *     title="Delete this draft?"
 *     message="This cannot be undone."
 *     confirmLabel="Delete"
 *     destructive
 *     onConfirm={handleDelete}
 *     onCancel={() => setOpen(false)}
 *   />
 */
export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
    busy = false,
    onConfirm,
    onCancel,
}) {
    const cancelRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const prev = document.activeElement;
        cancelRef.current?.focus();

        const onKey = (e) => {
            if (e.key === 'Escape' && !busy) onCancel?.();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            if (prev && typeof prev.focus === 'function') prev.focus();
        };
    }, [open, busy, onCancel]);

    if (!open) return null;

    return (
        <div
            className="overlay-shell confirm-dialog__scrim"
            onClick={() => { if (!busy) onCancel?.(); }}
            role="presentation"
        >
            <div
                className="overlay-shell__card confirm-dialog glass glass--strong"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-body"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 id="confirm-dialog-title" className="confirm-dialog__title">{title}</h3>
                {message && (
                    <p id="confirm-dialog-body" className="confirm-dialog__body">{message}</p>
                )}
                <div className="confirm-dialog__actions">
                    <button
                        ref={cancelRef}
                        type="button"
                        className="btn btn--secondary"
                        onClick={onCancel}
                        disabled={busy}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={`btn ${destructive ? 'btn--danger' : 'btn--primary'}${busy ? ' btn--loading' : ''}`}
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {busy && <span className="spinner-ring" aria-hidden="true" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
