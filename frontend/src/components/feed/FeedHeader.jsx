import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon } from '../../icons/Icons';
import ThemeToggle from '../common/ThemeToggle';

function useCompactNav() {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)');
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return compact;
}

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

  const visible = items.filter(Boolean);
  if (!visible.length) return null;

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
          {visible.map((item) => (
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
  hubAttention = 0,
  onWriteStory,
  onHubs,
  onProfile,
  onSettings,
  onNotifications,
  onAnalytics,
  onAdmin,
  onModeration,
}) {
  const compact = useCompactNav();
  const navigate = useNavigate();

  return (
    <div className="feed__header">
      <div className="feed__header-inner">
        <div className="feed__logo">Calm Stories</div>

        <div className="feed__nav">
          <button onClick={onWriteStory} className="feed__nav-btn feed__nav-btn--write">
            Write
          </button>

          {onHubs && !compact && (
            <button onClick={onHubs} className="feed__nav-btn feed__nav-btn--outline">
              Hubs
              {hubAttention > 0 && <span className="feed__nav-dot" aria-label="Hub activity" />}
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
              compact && onHubs && { label: hubAttention > 0 ? `Hubs (${hubAttention})` : 'Hubs', onClick: onHubs },
              compact && user?.username && { label: `@${user.username}`, onClick: () => onProfile(user.username) },
              onSettings && { label: 'Settings', onClick: onSettings },
              onAnalytics && { label: 'Writer stats', onClick: onAnalytics },
              { label: 'Shelves', onClick: () => navigate('/bookmarks') },
              { label: 'Tags', onClick: () => navigate('/tags') },
              { label: 'Badges', onClick: () => navigate('/achievements') },
              user?.role === 'admin' && onAdmin && { label: 'Admin', onClick: onAdmin },
              onModeration && ['admin', 'moderator'].includes(user?.role) && { label: 'Moderation', onClick: onModeration },
            ]} />
          </div>

          {user?.username && !compact && (
            <button onClick={() => onProfile(user.username)} className="feed__nav-btn feed__nav-btn--outline">
              @{user.username}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
