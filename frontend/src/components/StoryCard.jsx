import React, { useState, useEffect } from 'react';
import { bookmarkStory, unbookmarkStory, checkBookmark, translateText, fetchUserPreferences } from '../api/api';
import DualArrowIcon from '../icons/DualArrowIcon';
import { MicIcon, SpeakerIcon, ChatIcon } from '../icons/Icons';
import ShareButton from './ShareButton';
import LikeButton from './LikeButton';
import useSpeech from '../hooks/useSpeech';

export default function StoryCard({ story, onRead, onLike, onAuthorClick, onBookmarkRemoved, onViewThread, disableLike = false, isNew = false }) {

  const [bookmarking, setBookmarking] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [translatedPreview, setTranslatedPreview] = useState(null);
  const [translatedTitle, setTranslatedTitle] = useState(null);
  const [targetLang, setTargetLang] = useState('en');
  const [showTranslated, setShowTranslated] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);

  const { toggle: toggleSpeech, isSpeaking } = useSpeech(targetLang);

  useEffect(() => {
    const loadPrefs = () => {
      fetchUserPreferences().then(res => {
        if (res.preferences?.preferredLanguage) {
          setTargetLang(res.preferences.preferredLanguage);
        }
      }).catch(() => { });
    };

    loadPrefs();

    const handlePreferencesUpdate = (event) => {
      if (event.detail?.preferences?.preferredLanguage) {
        setTargetLang(event.detail.preferences.preferredLanguage);
      }
    };

    window.addEventListener('preferencesUpdated', handlePreferencesUpdate);
    return () => window.removeEventListener('preferencesUpdated', handlePreferencesUpdate);
  }, []);

  useEffect(() => {
    setShowTranslated(false);
    setTranslatedTitle(null);
    setTranslatedPreview(null);
    setTranslationError(null);
  }, [story._id]);

  useEffect(() => {
    const loadTranslations = async () => {
      const saved = localStorage.getItem(`translation_${story._id}`);
      const savedLang = localStorage.getItem(`translation_lang_${story._id}`);

      if (saved === 'true' && savedLang === targetLang && !showTranslated) {
        setShowTranslated(true);
      }

      if (savedLang && savedLang !== targetLang) {
        setShowTranslated(false);
        setTranslatedTitle(null);
        setTranslatedPreview(null);
        localStorage.setItem(`translation_${story._id}`, 'false');
        localStorage.removeItem(`translation_lang_${story._id}`);
        return;
      }

      if (showTranslated && !translatedPreview && !translatedTitle) {
        try {
          const [titleResult, previewResult] = await Promise.all([
            translateText(`${story._id}_title`, 'story_title', story.title, targetLang),
            translateText(story._id, 'story_text', (story.preview || story.text || '').substring(0, 200), targetLang)
          ]);

          if (titleResult.translatedText && previewResult.translatedText) {
            setTranslatedTitle(titleResult.translatedText);
            setTranslatedPreview(previewResult.translatedText);
          }
        } catch (error) {
          console.error('Failed to load translations:', error);
          setTranslationError('Translation failed');
          setShowTranslated(false);
          localStorage.setItem(`translation_${story._id}`, 'false');
          localStorage.removeItem(`translation_lang_${story._id}`);
          setTimeout(() => setTranslationError(null), 3000);
        }
      }
    };

    loadTranslations();
  }, [showTranslated, targetLang, story._id, story.title, story.preview, story.text]);

  useEffect(() => {
    if (story._id) {
      checkBookmark(story._id).then(result => {
        setIsBookmarked(!!(result.isBookmarked ?? result.bookmarked));
      }).catch(() => { });
    }
  }, [story._id]);

  const handleAuthorClick = (e) => {
    e.stopPropagation();
    if (onAuthorClick) onAuthorClick();
  };

  const handleBookmark = async (e) => {
    e.stopPropagation();
    if (bookmarking) return;
    const next = !isBookmarked;
    setIsBookmarked(next);
    setBookmarking(true);
    try {
      const result = next ? await bookmarkStory(story._id) : await unbookmarkStory(story._id);
      if (!result.success) {
        setIsBookmarked(!next);
        return;
      }
      if (!next && onBookmarkRemoved) onBookmarkRemoved(story._id);
    } catch (error) {
      setIsBookmarked(!next);
      console.error('Failed to toggle bookmark:', error);
    } finally {
      setBookmarking(false);
    }
  };

  const handleTranslate = async (e) => {
    e.stopPropagation();
    if (showTranslated) {
      setShowTranslated(false);
      localStorage.setItem(`translation_${story._id}`, 'false');
      localStorage.removeItem(`translation_lang_${story._id}`);
      return;
    }
    if (translatedPreview && translatedTitle) {
      setShowTranslated(true);
      localStorage.setItem(`translation_${story._id}`, 'true');
      localStorage.setItem(`translation_lang_${story._id}`, targetLang);
      return;
    }
    setTranslating(true);
    setTranslationError(null);
    try {
      const [titleResult, previewResult] = await Promise.all([
        translateText(`${story._id}_title`, 'story_title', story.title, targetLang),
        translateText(story._id, 'story_text', (story.preview || story.text || '').substring(0, 200), targetLang)
      ]);
      if (titleResult.translatedText && previewResult.translatedText) {
        setTranslatedTitle(titleResult.translatedText);
        setTranslatedPreview(previewResult.translatedText);
        setShowTranslated(true);
        localStorage.setItem(`translation_${story._id}`, 'true');
        localStorage.setItem(`translation_lang_${story._id}`, targetLang);
      } else {
        throw new Error('Translation returned empty results');
      }
    } catch (error) {
      console.error('Translation failed:', error);
      setTranslationError('Translation failed');
      setTimeout(() => setTranslationError(null), 3000);
    } finally {
      setTranslating(false);
    }
  };

  const handleSpeech = (e) => {
    e.stopPropagation();
    const textToSpeak = showTranslated && translatedPreview
      ? `${translatedTitle || story.title}. ${translatedPreview}`
      : `${story.title}. ${story.preview}`;
    toggleSpeech(textToSpeak);
  };

  const timeAgo = (date) => {
    const now = new Date();
    const posted = new Date(date);
    const diffMs = now - posted;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  return (
    <div className={`story-card${isNew ? ' story-card--new' : ''}`} onClick={onRead}>
      {/* Header */}
      <div className="story-card__header">
        <div className="story-card__meta">
          {/* Avatar */}
          {story.authorProfilePicture ? (
            <img
              src={story.authorProfilePicture}
              alt={story.authorUsername}
              className="story-card__avatar"
            />
          ) : (
            <div className="story-card__avatar-placeholder">
              {story.authorUsername?.[0]?.toUpperCase() || '?'}
            </div>
          )}

          <button
            onClick={handleAuthorClick}
            className={`story-card__author-btn${onAuthorClick ? '' : ' story-card__author-btn--plain'}`}
          >
            @{story.authorUsername}
          </button>

          <span className="story-card__time">{timeAgo(story.createdAt)}</span>
        </div>

        {/* Action buttons */}
        <div className="story-card__actions">
          {translationError && (
            <span className="story-card__translation-error">{translationError}</span>
          )}

          {/* Translate */}
          <button
            onClick={handleTranslate}
            className={`story-card__action-btn${showTranslated ? ' story-card__action-btn--translate-active' : ''}${translating ? ' is-busy' : ''}`}
            title={showTranslated ? 'Show Original' : 'Translate Preview'}
          >
            <DualArrowIcon size={16} color={showTranslated ? 'var(--blue-icon)' : 'var(--text-muted)'} />
          </button>

          {/* Speech */}
          <button
            onClick={handleSpeech}
            className={`story-card__action-btn${isSpeaking ? ' story-card__action-btn--speech-active' : ''}`}
            title={isSpeaking ? 'Stop Reading' : 'Read Aloud'}
          >
            {isSpeaking ? <SpeakerIcon size={16} /> : <MicIcon size={16} />}
          </button>

          {/* Bookmark */}
          <button
            onClick={handleBookmark}
            className={`story-card__action-btn${isBookmarked ? ' story-card__action-btn--bookmark-active' : ''}`}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark story'}
          >
            <div className="bookmark-icon">
              <div className={`bookmark-icon__shape ${isBookmarked ? 'bookmark-icon__shape--active' : 'bookmark-icon__shape--inactive'}`} />
            </div>
          </button>

          {/* Like */}
          <LikeButton story={story} onLike={onLike} disabled={disableLike} />

          <ShareButton story={story} style={{ fontSize: '0.85em', padding: '6px 12px' }} />
        </div>
      </div>

      {/* Cover Image */}
      {story.coverImage?.url && story.showCoverImage && (
        <div className="story-card__cover">
          <img src={story.coverImage.url} alt={story.title || 'Story cover'} loading="lazy" />
        </div>
      )}

      {/* Title */}
      {story.title && (
        <div className="story-card__title">
          {translating ? (
            <div className="story-card__title-skeleton" />
          ) : (
            showTranslated && translatedTitle ? translatedTitle : story.title
          )}
        </div>
      )}

      {/* Preview */}
      <div className="story-card__preview">
        {translating ? (
          <div className="story-card__preview-skeleton">
            <div className="story-card__preview-skeleton-line" style={{ width: '90%' }} />
            <div className="story-card__preview-skeleton-line" style={{ width: '60%' }} />
          </div>
        ) : showTranslated ? translatedPreview : story.preview}
      </div>

      <div className="story-card__footer">
        <div className="story-card__read-more">Read full story →</div>
        {onViewThread && (
          <button
            type="button"
            className="story-card__thread-btn"
            onClick={(e) => {
              e.stopPropagation();
              onViewThread(story._id);
            }}
          >
            <ChatIcon size={13} /> View thread
          </button>
        )}
      </div>
    </div>
  );
}