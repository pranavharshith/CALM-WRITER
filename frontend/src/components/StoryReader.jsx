import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import ProgressBar from './ProgressBar';
import ShareButton from './ShareButton';
import EditRequestsList from './EditRequestsList';
import EditRequestModal from './EditRequestModal';
import LikeButton from './LikeButton';
import { trackReadSession, fetchCurrentUser, fetchUserPreferences, translateText } from '../api/api';
import DualArrowIcon from '../icons/DualArrowIcon';
import { MicIcon, SpeakerIcon, PencilIcon, ArrowLeftIcon } from '../icons/Icons';
import useSpeech from '../hooks/useSpeech';
import useToast from '../hooks/useToast';

// Font size map — runtime user preference, legitimately inline
const FONT_SIZE_MAP = { small: '1em', medium: '1.17em', large: '1.4em' };

export default function StoryReader({ story, onBack, onLike }) {
  const [percentRead, setPercentRead] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [preferences, setPreferences] = useState({ fontSize: 'medium', preferredLanguage: 'en' });
  const [targetLang, setTargetLang] = useState('en');
  const [translatedText, setTranslatedText] = useState(null);
  const [translatedTitle, setTranslatedTitle] = useState(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);
  const ref = useRef(null);

  const { toggle: toggleSpeech, isSpeaking } = useSpeech(targetLang);
  const toast = useToast();

  useEffect(() => {
    loadCurrentUser();
    loadPreferences();
    const handlePreferencesUpdate = (event) => {
      if (event.detail?.preferences) {
        setPreferences(event.detail.preferences);
        if (event.detail.preferences.preferredLanguage) {
          setTargetLang(event.detail.preferences.preferredLanguage);
        }
      }
    };
    window.addEventListener('preferencesUpdated', handlePreferencesUpdate);
    return () => window.removeEventListener('preferencesUpdated', handlePreferencesUpdate);
  }, []);

  useEffect(() => {
    setShowTranslated(false);
    setTranslatedTitle(null);
    setTranslatedText(null);
    setTranslationError(null);
  }, [story._id]);

  const loadCurrentUser = async () => {
    try {
      const user = await fetchCurrentUser();
      setCurrentUser(user);
    } catch (error) { /* silent */ }
  };

  const loadPreferences = async () => {
    try {
      const result = await fetchUserPreferences();
      if (result.preferences) {
        setPreferences(result.preferences);
        if (result.preferences.preferredLanguage) setTargetLang(result.preferences.preferredLanguage);
      }
    } catch (error) { /* silent */ }
  };

  useEffect(() => {
    if (!ref.current || !story) return;
    const el = ref.current;
    function onScroll() {
      const percent = Math.min(100, Math.round(100 * (el.scrollTop + el.clientHeight) / el.scrollHeight));
      setPercentRead(percent);
      if (percent > 0) trackReadSession(story._id, percent).catch(console.error);
    }
    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [story]);

  useEffect(() => {
    const loadTranslations = async () => {
      const saved = localStorage.getItem(`translation_${story._id}`);
      const savedLang = localStorage.getItem(`translation_lang_${story._id}`);

      if (saved === 'true' && savedLang === targetLang && !showTranslated) setShowTranslated(true);

      if (savedLang && savedLang !== targetLang) {
        setShowTranslated(false);
        setTranslatedTitle(null);
        setTranslatedText(null);
        localStorage.setItem(`translation_${story._id}`, 'false');
        localStorage.removeItem(`translation_lang_${story._id}`);
        return;
      }

      if (showTranslated && !translatedText && !translatedTitle) {
        try {
          const [titleResult, textResult] = await Promise.all([
            translateText(`${story._id}_title`, 'story_title', story.title, targetLang),
            translateText(story._id, 'story_text', story.text, targetLang)
          ]);
          if (titleResult.translatedText && textResult.translatedText) {
            setTranslatedTitle(titleResult.translatedText);
            setTranslatedText(textResult.translatedText);
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
  }, [showTranslated, targetLang, story._id, story.title, story.text, translatedText, translatedTitle]);

  const handleTranslate = async () => {
    if (showTranslated) {
      setShowTranslated(false);
      localStorage.setItem(`translation_${story._id}`, 'false');
      localStorage.removeItem(`translation_lang_${story._id}`);
      return;
    }
    if (translatedText && translatedTitle) {
      setShowTranslated(true);
      localStorage.setItem(`translation_${story._id}`, 'true');
      localStorage.setItem(`translation_lang_${story._id}`, targetLang);
      return;
    }
    setTranslating(true);
    setTranslationError(null);
    try {
      const [titleResult, textResult] = await Promise.all([
        translateText(`${story._id}_title`, 'story_title', story.title, targetLang),
        translateText(story._id, 'story_text', story.text, targetLang)
      ]);
      if (titleResult.translatedText && textResult.translatedText) {
        setTranslatedTitle(titleResult.translatedText);
        setTranslatedText(textResult.translatedText);
        setShowTranslated(true);
        localStorage.setItem(`translation_${story._id}`, 'true');
        localStorage.setItem(`translation_lang_${story._id}`, targetLang);
      } else {
        throw new Error('Translation returned empty results');
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationError('Translation failed');
      setTimeout(() => setTranslationError(null), 3000);
    } finally {
      setTranslating(false);
    }
  };

  const handleSpeech = () => {
    const textToSpeak = showTranslated && translatedText && translatedTitle
      ? `${translatedTitle}. ${translatedText}`
      : `${story.title}. ${story.text}`;
    toggleSpeech(textToSpeak);
  };

  if (!story) {
    return (
      <div className="reader__no-story">
        <p>No story available</p>
        <button onClick={onBack} className="btn btn--secondary" style={{ marginTop: '20px' }}>Back</button>
      </div>
    );
  }

  const storyPreview = (story.text || '').substring(0, 200).replace(/\n/g, ' ');
  const shareUrl = `${window.location.origin}/story/${story._id}`;

  return (
    <div className="reader">
      <Helmet>
        <title>{story.title || 'Story'} - Calm Stories</title>
        <meta name="description" content={storyPreview + '...'} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:title" content={`${story.title || 'Story'} by ${story.authorUsername || 'Anonymous'}`} />
        <meta property="og:description" content={storyPreview + '...'} />
        <meta property="og:site_name" content="Calm Stories" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={shareUrl} />
        <meta name="twitter:title" content={`${story.title || 'Story'} by ${story.authorUsername || 'Anonymous'}`} />
        <meta name="twitter:description" content={storyPreview + '...'} />
        <meta property="og:image:alt" content={`Read "${story.title || 'Story'}" on Calm Stories`} />
      </Helmet>

      <div className="reader__inner">
        {/* Top bar */}
        <div className="reader__topbar">
          <button onClick={onBack} className="btn-back"><ArrowLeftIcon size={14} /> Back</button>

          <div className="reader__actions">
            {/* Translate */}
            <button
              onClick={handleTranslate}
              disabled={translating}
              title={showTranslated ? 'Show Original' : 'Translate Story'}
              className={`reader__translate-btn${showTranslated ? ' reader__translate-btn--active' : ''}`}
              style={{ cursor: translating ? 'wait' : 'pointer', opacity: translating ? 0.7 : 1 }}
            >
              <DualArrowIcon size={18} color={showTranslated ? 'var(--blue-icon)' : 'var(--text-muted)'} />
            </button>

            {/* Speech */}
            <button
              onClick={handleSpeech}
              title={isSpeaking ? 'Stop Reading' : 'Read Story Aloud'}
              className={`reader__speech-btn${isSpeaking ? ' reader__speech-btn--active' : ''}`}
            >
              {isSpeaking ? <SpeakerIcon size={18} /> : <MicIcon size={18} />}
            </button>

            {translationError && (
              <span className="reader__translation-error">Failed</span>
            )}

            {/* Like */}
            <LikeButton story={story} onLike={onLike} />

            <ShareButton story={story} />

            {currentUser && currentUser.internalId !== story.internalAuthorId && (
              <button onClick={() => setShowEditModal(true)} className="reader__edit-btn">
                <PencilIcon size={13} /> Request Edit
              </button>
            )}
          </div>
        </div>

        {/* Story content */}
        <div ref={ref} className="reader__content">
          <ProgressBar percent={percentRead} />
          <div style={{
            fontSize: FONT_SIZE_MAP[preferences.fontSize] || '1.17em',
            lineHeight: '1.72',
            whiteSpace: 'pre-wrap',
            marginBottom: 28,
            color: 'var(--text-primary)'
          }}>
            {translating ? (
              <div className="reader__translating">
                Translating...
                <div className="reader__skeleton-line" style={{ width: '60%' }} />
                <div className="reader__skeleton-line" style={{ width: '80%' }} />
                <div className="reader__skeleton-line" style={{ width: '40%' }} />
              </div>
            ) : showTranslated ? translatedText : story.text}
          </div>
        </div>

        {/* Edit Requests */}
        {currentUser && (
          <EditRequestsList
            story={story}
            currentUserId={currentUser.internalId}
            isAuthor={currentUser.internalId === story.internalAuthorId}
          />
        )}

        {showEditModal && (
          <EditRequestModal
            story={story}
            onClose={() => setShowEditModal(false)}
            onSuccess={() => {
              setShowEditModal(false);
              toast.success('Edit request submitted — it needs 10 votes before the author can respond.');
            }}
          />
        )}
      </div>
    </div>
  );
}
