import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import ProgressBar from '../common/ProgressBar';
import ShareButton from '../common/ShareButton';
import EditRequestsList from './EditRequestsList';
import EditRequestModal from './EditRequestModal';
import ReportModal from '../moderation/ReportModal';
import LikeButton from '../common/LikeButton';
import { trackReadSession, fetchCurrentUser, fetchUserPreferences, translateText, updateStoryTags } from '../../api/api';
import DualArrowIcon from '../../icons/DualArrowIcon';
import { MicIcon, SpeakerIcon, PencilIcon, ArrowLeftIcon } from '../../icons/Icons';
import useSpeech from '../../hooks/useSpeech';
import useToast from '../../hooks/useToast';
import TagChips from './TagChips';
import TagInput from './TagInput';

// Font size map — runtime user preference, legitimately inline
const FONT_SIZE_MAP = { small: '1em', medium: '1.17em', large: '1.4em' };

export default function StoryReader({ story, onBack, onLike }) {
  const [percentRead, setPercentRead] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [preferences, setPreferences] = useState({
    fontSize: 'medium',
    preferredLanguage: 'en',
    calmMode: true,
    autoScroll: false,
    autoScrollSpeed: 'medium',
  });
  const [targetLang, setTargetLang] = useState('en');
  const [translatedText, setTranslatedText] = useState(null);
  const [translatedTitle, setTranslatedTitle] = useState(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);
  const [tags, setTags] = useState(Array.isArray(story.tags) ? story.tags : []);
  const [tagDraft, setTagDraft] = useState(Array.isArray(story.tags) ? story.tags : []);
  const [editingTags, setEditingTags] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
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
    const next = Array.isArray(story.tags) ? story.tags : [];
    setTags(next);
    setTagDraft(next);
    setEditingTags(false);
  }, [story._id]);

  const canEditTags = (() => {
    if (!currentUser) return false;
    if (currentUser.canTagContent) return true;
    if (['trusted_user', 'moderator', 'admin'].includes(currentUser.role)) return true;
    if (currentUser.internalId && currentUser.internalId === story.internalAuthorId) {
      const published = new Date(story.publishedAt || story.createdAt).getTime();
      return Date.now() - published <= 5 * 60 * 1000;
    }
    return false;
  })();

  const saveTags = async () => {
    setSavingTags(true);
    try {
      const res = await updateStoryTags(story._id, tagDraft);
      if (res.success === false) throw new Error(res.error || 'Failed');
      const next = res.tags || tagDraft;
      setTags(next);
      setTagDraft(next);
      setEditingTags(false);
      toast.success('Tags saved');
    } catch (err) {
      toast.error(err.message || 'Could not save tags');
    } finally {
      setSavingTags(false);
    }
  };

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
    function measure() {
      const paneScrolls = el.scrollHeight > el.clientHeight + 2;
      let percent;
      if (paneScrolls) {
        percent = Math.min(100, Math.round(100 * (el.scrollTop + el.clientHeight) / el.scrollHeight));
      } else {
        const rect = el.getBoundingClientRect();
        const seen = Math.min(el.scrollHeight, Math.max(0, window.innerHeight - rect.top));
        percent = Math.min(100, Math.max(0, Math.round(100 * seen / Math.max(1, el.scrollHeight))));
      }
      setPercentRead(percent);
      if (percent > 0) trackReadSession(story._id, percent).catch(console.error);
    }
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('scroll', measure, { passive: true });
    measure();
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [story]);

  useEffect(() => {
    if (!preferences.autoScroll || !ref.current || !story) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }
    const el = ref.current;
    const px = { slow: 0.35, medium: 0.7, fast: 1.35 }[preferences.autoScrollSpeed] || 0.7;
    let raf;
    let paused = false;
    let resumeTimer;
    const tick = () => {
      if (!paused && el.scrollTop + el.clientHeight < el.scrollHeight - 1) {
        el.scrollTop += px;
      }
      raf = requestAnimationFrame(tick);
    };
    const pause = () => {
      paused = true;
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { paused = false; }, 2200);
    };
    el.addEventListener('pointerdown', pause);
    el.addEventListener('wheel', pause, { passive: true });
    el.addEventListener('touchstart', pause, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resumeTimer);
      el.removeEventListener('pointerdown', pause);
      el.removeEventListener('wheel', pause);
      el.removeEventListener('touchstart', pause);
    };
  }, [preferences.autoScroll, preferences.autoScrollSpeed, story]);

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
    <div className={`reader${preferences.calmMode !== false ? ' reader--calm' : ''}`}>
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
            <button
              onClick={handleTranslate}
              disabled={translating}
              title={showTranslated ? 'Show Original' : 'Translate Story'}
              className={`reader__translate-btn${showTranslated ? ' reader__translate-btn--active' : ''}`}
              style={{ cursor: translating ? 'wait' : 'pointer', opacity: translating ? 0.7 : 1 }}
            >
              <DualArrowIcon size={18} color={showTranslated ? 'var(--blue-icon)' : 'var(--text-muted)'} />
            </button>

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

            <LikeButton story={story} onLike={onLike} />
            <ShareButton story={story} />

            {preferences.calmMode === false && currentUser && currentUser.internalId !== story.internalAuthorId && (
              <button onClick={() => setShowEditModal(true)} className="reader__edit-btn">
                <PencilIcon size={13} /> Request Edit
              </button>
            )}
            {preferences.calmMode === false && currentUser && (
              <button onClick={() => setShowReportModal(true)} className="reader__edit-btn">
                Report
              </button>
            )}
          </div>
        </div>

        {editingTags ? (
          <div className="reader__tags reader__tags-edit">
            <TagInput tags={tagDraft} onChange={setTagDraft} />
            <div className="shelves__view-actions">
              <button type="button" className="btn btn--secondary" onClick={() => { setTagDraft(tags); setEditingTags(false); }} disabled={savingTags}>
                Cancel
              </button>
              <button type="button" className={`btn btn--primary${savingTags ? ' btn--loading' : ''}`} onClick={saveTags} disabled={savingTags}>
                {savingTags && <span className="spinner-ring" aria-hidden="true" />}
                Save tags
              </button>
            </div>
          </div>
        ) : (
          <div className="reader__tags">
            <TagChips tags={tags} />
            {canEditTags && (
              <button type="button" className="btn btn--secondary" onClick={() => setEditingTags(true)}>
                {tags.length ? 'Edit tags' : 'Add tags'}
              </button>
            )}
          </div>
        )}

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
        {preferences.calmMode === false && currentUser && (
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
        {showReportModal && (
          <ReportModal
            storyId={story._id}
            storyTitle={story.title}
            onClose={() => setShowReportModal(false)}
          />
        )}
      </div>
    </div>
  );
}
