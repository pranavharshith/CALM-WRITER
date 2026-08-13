import React from 'react';
import { StarIcon, HeartIcon, ArrowLeftIcon } from '../icons/Icons';

export default function FeaturedBanner({ story, onRead }) {
  return (
    <div
      onClick={onRead}
      className="glass glass--hover"
      style={{
        borderRadius: 'var(--radius-lg)',
        padding: '32px',
        marginBottom: '20px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}>

      {/* Featured Badge */}
      <div className="glass-chip" style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        background: 'var(--sage)',
        color: 'var(--sage-contrast)',
        padding: '4px 12px',
        borderRadius: 'var(--radius-pill)',
        fontSize: '0.8em',
        fontWeight: '600',
        border: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <StarIcon size={12} /> Featured Story
      </div>

      {/* Content */}
      <div style={{
        marginRight: '130px'
      }}>
        <div style={{
          fontSize: '0.9em',
          color: 'var(--text-secondary)',
          marginBottom: '8px'
        }}>
          Story of the Week by @{story.authorUsername}
        </div>

        {story.title && (
          <div style={{
            fontSize: 'var(--fs-xl)',
            fontFamily: 'var(--font-serif)',
            fontWeight: '600',
            marginBottom: '12px',
            color: 'var(--text-primary)',
            lineHeight: '1.3'
          }}>
            {story.title}
          </div>
        )}

        <div style={{
          fontSize: '1.1em',
          lineHeight: '1.6',
          color: 'var(--text-primary)',
          marginBottom: '16px',
          whiteSpace: 'pre-wrap',
          fontFamily: 'var(--font-serif)'
        }}>
          {(story.text || '').substring(0, 300)}{(story.text || '').length > 300 ? '...' : ''}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '0.9em',
          color: 'var(--text-secondary)'
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <HeartIcon size={14} color="var(--rose)" /> {story.likes} likes
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Read full story <ArrowLeftIcon size={13} style={{ transform: 'rotate(180deg)' }} />
          </span>
        </div>
      </div>
    </div>
  );
}
