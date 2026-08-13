import { useContext } from 'react';
import { ToastContext } from '../components/ToastProvider';

/**
 * useToast – glass toast API. Must be called under <ToastProvider>.
 *
 *   const toast = useToast();
 *   toast.success('Saved');
 *   toast.error('Could not save');
 *   toast.info('Link copied');
 */
export default function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be used within <ToastProvider>');
    }
    return ctx;
}
