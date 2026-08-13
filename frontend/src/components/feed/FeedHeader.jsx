import React, { useState, useEffect, useRef } from 'react';
import { BellIcon } from '../../icons/Icons';
import ThemeToggle from '../ThemeToggle';

function NavMore({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (!items.length) return null;

  return (
    <div className="feed__more" ref={ref}>
      <button
        type="button"
        className="btn-icon"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="More"
        onClick={() => setOpen((v) => !v)}
      >
        ···
      </button>
      {open && (
        <div className="feed__more-menu glass glass--strong" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="feed__more-item"
              onClick={() => { setOpen(false); item.onClick(); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FeedHeader({
  user,
  unreadCount,
  onWriteStory,
  onHubs,
  onProfile,
  onSettings,
  onNotifications,
  onAnalytics,
  onAdmin,
  onModeration,
}) {
  return (
    <div className="feed__header">
      <div className="feed__header-inner">
        <div className="feed__logo">Calm Stories</div>

        <div className="feed__nav">
          <button onClick={onWriteStory} className="feed__nav-btn feed__nav-btn--write">
            Write
          </button>

          {onHubs && (
            <button onClick={onHubs} className="feed__nav-btn feed__nav-btn--outline">
              Hubs
            </button>
          )}

          <div className="feed__nav-cluster">
            <ThemeToggle size={15} />

            {onNotifications && (
              <button onClick={onNotifications} className="feed__notif-btn" aria-label="Notifications">
                <BellIcon size={16} />
                {unreadCount > 0 && (
                  <span className="feed__notif-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            <NavMore items={[
              onSettings && { label: 'Settings', onClick: onSettings },
              onAnalytics && { label: 'Writer stats', onClick: onAnalytics },
              user?.role === 'admin' && onAdmin && { label: 'Admin', onClick: onAdmin },
              onModeration && ['admin', 'moderator'].includes(user?.role) && { label: 'Moderation', onClick: onModeration },
            ].filter(Boolean)} />
          </div>

          {user?.username && (
            <button onClick={() => onProfile(user.username)} className="feed__nav-btn feed__nav-btn--outline">
              @{user.username}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
