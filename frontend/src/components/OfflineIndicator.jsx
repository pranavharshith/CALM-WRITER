import React, { useState, useEffect } from 'react';

/**
 * Offline Indicator Component
 * Shows user when they've lost internet connection
 */
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null; // Don't show anything when online
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        right: '20px',
        maxWidth: '400px',
        background: '#ff6b6b',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.95em'
      }}>
      <span style={{ fontSize: '1.2em' }}>⚠️</span>
      <div>
        <strong>No Internet Connection</strong>
        <div style={{ fontSize: '0.85em', opacity: 0.9, marginTop: '4px' }}>
          Some features may be unavailable. Please check your connection.
        </div>
      </div>
    </div>
  );
}
