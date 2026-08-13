import React, { useState, useEffect } from 'react';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../api/api';
import { SkeletonNotification, SkeletonRegion } from './SkeletonLoader';
import useRegionLoading from '../hooks/useRegionLoading';
import useToast from '../hooks/useToast';
import { BellIcon, HeartIcon, PencilIcon, CheckIcon, UserIcon, ArrowLeftIcon } from '../icons/Icons';

export default function Notifications({ onBack, onNavigate }) {
    const [notifications, setNotifications] = useState([]);
    const [rawLoading, setRawLoading] = useState(true);
    const [paging, setPaging] = useState(false);
    const regionLoading = useRegionLoading(rawLoading);
    const pagingLoading = useRegionLoading(paging);
    const toast = useToast();
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
            setHasMore(result.pagination?.hasNext || false);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setRawLoading(false);
        }
    };

    const handleMarkRead = async (notificationId) => {
        setNotifications(prev =>
            prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
        );
        try {
            await markNotificationRead(notificationId);
        } catch (error) {
            setNotifications(prev =>
                prev.map(n => n._id === notificationId ? { ...n, read: false } : n)
            );
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllRead = async () => {
        const prev = notifications;
        setNotifications(list => list.map(n => ({ ...n, read: true })));
        try {
            await markAllNotificationsRead();
            toast.success('All notifications marked read');
        } catch (error) {
            setNotifications(prev);
            toast.error('Could not mark notifications read');
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
                return <UserIcon size={16} />;
            case 'like':
                return <HeartIcon size={16} />;
            case 'edit_request':
                return <PencilIcon size={16} />;
            case 'edit_approved':
                return <CheckIcon size={16} />;
            default:
                return <BellIcon size={16} />;
        }
    };

    return (
        <div className="page" style={{ minHeight: '100vh', padding: '20px' }}>
            <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                <button onClick={onBack} className="btn-back" style={{ fontSize: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowLeftIcon size={14} /> Back
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', marginTop: '16px' }}>
                    <h1 style={{ fontSize: 'var(--fs-2xl)', margin: 0, fontFamily: 'var(--font-serif)', fontWeight: 600 }}>Notifications</h1>
                    {notifications.some(n => !n.read) && (
                        <button
                            onClick={handleMarkAllRead}
                            className="btn btn--secondary"
                        >
                            Mark all read
                        </button>
                    )}
                </div>

                <SkeletonRegion
                    loading={regionLoading}
                    minHeight={360}
                    skeleton={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonNotification key={i} />)}
                        </div>
                    }
                >
                {notifications.length === 0 ? (
                    <div className="glass" style={{ textAlign: 'center', padding: '60px', borderRadius: 'var(--radius-lg)' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--text-tertiary)' }}>
                            <BellIcon size={44} />
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>No notifications yet</div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {notifications.map(notification => (
                            <div
                                key={notification._id}
                                onClick={() => handleNotificationClick(notification)}
                                className="glass glass--hover"
                                style={{
                                    padding: '16px 20px',
                                    borderRadius: 'var(--radius-lg)',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                    opacity: notification.read ? 0.72 : 1,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                                    <div className="glass-chip" style={{ width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '15px',
                                            lineHeight: '1.5',
                                            color: 'var(--text-primary)',
                                            fontWeight: notification.read ? 'normal' : '600'
                                        }}>
                                            {notification.message}
                                        </div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            {formatTime(notification.createdAt)}
                                        </div>
                                    </div>
                                    {!notification.read && (
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            background: 'var(--accent)',
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

                </SkeletonRegion>

                {pagingLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                        <SkeletonNotification />
                        <SkeletonNotification />
                    </div>
                )}

                {hasMore && !regionLoading && !pagingLoading && (
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <button
                            onClick={async () => {
                                const next = page + 1;
                                setPaging(true);
                                try {
                                    const result = await fetchNotifications(next, 20);
                                    setNotifications(prev => [...prev, ...(result.notifications || [])]);
                                    setHasMore(result.pagination?.hasNext || false);
                                    setPage(next);
                                } catch (error) {
                                    console.error('Failed to load more notifications:', error);
                                } finally {
                                    setPaging(false);
                                }
                            }}
                            className="feed__load-more-btn"
                        >
                            Load More
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
