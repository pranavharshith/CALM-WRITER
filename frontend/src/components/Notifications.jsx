import React, { useState, useEffect } from 'react';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, getUnreadNotificationCount } from '../api/api';
import { SkeletonNotifications } from './SkeletonLoader';
import useMinLoadTime from '../hooks/useMinLoadTime';

export default function Notifications({ onBack, onNavigate }) {
    const [notifications, setNotifications] = useState([]);
    const [rawLoading, setRawLoading] = useState(true);
    const loading = useMinLoadTime(rawLoading, 1000);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        setRawLoading(true);
        try {
            const result = await fetchNotifications(page, 20);
            setNotifications(result.notifications || []);
            setHasMore(result.pagination?.hasMore || false);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setRawLoading(false);
        }
    };

    const handleMarkRead = async (notificationId) => {
        try {
            await markNotificationRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
            );
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            handleMarkRead(notification._id);
        }

        // Navigate based on notification type
        if (notification.storyId && onNavigate) {
            onNavigate(`/story/${notification.storyId}`);
        } else if (notification.fromUsername && notification.type === 'follow' && onNavigate) {
            onNavigate(`/profile/${notification.fromUsername}`);
        }
    };

    const formatTime = (date) => {
        const now = new Date();
        const notifDate = new Date(date);
        const diffMs = now - notifDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 7) {
            return notifDate.toLocaleDateString();
        } else if (diffDays > 0) {
            return `${diffDays}d ago`;
        } else if (diffHours > 0) {
            return `${diffHours}h ago`;
        } else if (diffMins > 0) {
            return `${diffMins}m ago`;
        } else {
            return 'Just now';
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'follow':
                return '👤';
            case 'like':
                return '❤️';
            case 'edit_request':
                return '✏️';
            case 'edit_approved':
                return '✅';
            default:
                return '🔔';
        }
    };

    return (
        <div style={{
            fontFamily: 'Georgia, serif',
            background: '#fefefd',
            minHeight: '100vh',
            padding: '20px',
        }}>
            <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                <button onClick={onBack} style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    marginBottom: '20px',
                    color: '#666'
                }}>
                    ← Back
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h1 style={{ fontSize: '28px', margin: 0 }}>Notifications</h1>
                    {notifications.some(n => !n.read) && (
                        <button
                            onClick={handleMarkAllRead}
                            style={{
                                padding: '8px 16px',
                                background: 'transparent',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: '#666'
                            }}
                        >
                            Mark all read
                        </button>
                    )}
                </div>

                {loading && notifications.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        {[1, 2, 3, 4, 5, 6].map(i => <SkeletonNotification key={i} />)}
                    </div>
                ) : notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
                        <div>No notifications yet</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        {notifications.map(notification => (
                            <div
                                key={notification._id}
                                onClick={() => handleNotificationClick(notification)}
                                style={{
                                    padding: '16px 20px',
                                    background: notification.read ? '#fff' : '#f8f9fa',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                onMouseLeave={(e) => e.currentTarget.style.background = notification.read ? '#fff' : '#f8f9fa'}
                            >
                                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                                    <div style={{ fontSize: '24px', flexShrink: 0 }}>
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '15px',
                                            lineHeight: '1.5',
                                            color: '#333',
                                            fontWeight: notification.read ? 'normal' : '600'
                                        }}>
                                            {notification.message}
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>
                                            {formatTime(notification.createdAt)}
                                        </div>
                                    </div>
                                    {!notification.read && (
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            background: '#3d5a80',
                                            borderRadius: '50%',
                                            flexShrink: 0,
                                            marginTop: '6px'
                                        }} />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {hasMore && (
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <button
                            onClick={() => {
                                setPage(p => p + 1);
                                loadNotifications();
                            }}
                            style={{
                                padding: '10px 24px',
                                background: 'transparent',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                color: '#666'
                            }}
                        >
                            Load More
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
