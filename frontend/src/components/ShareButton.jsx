import React from 'react';

export default function ShareButton({ story, style = {} }) {
    const handleShare = async (e) => {
        e.stopPropagation(); // Prevent parent click handlers from firing

        const shareUrl = `${window.location.origin}/story/${story._id}`;
        const shareText = `${story.title || 'Story'} by ${story.authorUsername || 'Anonymous'} on Calm Stories`;

        // Check if Web Share API is available (mobile devices)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: story.title || 'Story',
                    text: shareText,
                    url: shareUrl,
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error sharing:', error);
                    fallbackCopyToClipboard(shareUrl);
                }
            }
        } else {
            // Fallback: copy to clipboard
            fallbackCopyToClipboard(shareUrl);
        }
    };

    const fallbackCopyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('Link copied to clipboard! Share it anywhere you like.');
        }).catch(err => {
            console.error('Failed to copy:', err);
            // Final fallback: show the URL
            prompt('Copy this link to share:', text);
        });
    };

    return (
        <button
            onClick={handleShare}
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 8px',
                borderRadius: '4px',
                color: '#666',
                fontSize: '0.85em',
                transition: 'all 0.2s ease',
                ...style
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
            }}
            title="Share this story"
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            Share
        </button>
    );
}
