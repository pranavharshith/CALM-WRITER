import React, { useState, useEffect, useRef } from 'react';
import { saveDraft, fetchDrafts, deleteDraft, publishDraft, checkCanWrite } from '../../api/api';
import { SkeletonWriteScreen } from '../skeletons';
import useMinLoadTime from '../../hooks/useMinLoadTime';
import useToast from '../../hooks/useToast';
import ConfirmDialog from '../common/ConfirmDialog';
import { cacheClearPrefix } from '../../utils/screenCache';

export default function WriteScreen({ onBack, user, setUser }) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sending, setSending] = useState(false);
  const [canPublish, setCanPublish] = useState(true);
  const [timeUntilNext, setTimeUntilNext] = useState(0);
  const [drafts, setDrafts] = useState([]);
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [showDrafts, setShowDrafts] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');

  // Initial load state
  const [rawLoading, setRawLoading] = useState(true);
  const loading = useMinLoadTime(rawLoading);
  const [draftToDelete, setDraftToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const autoSaveTimer = useRef(null);
  const draftIdRef = useRef(null);
  const promptIdRef = useRef(null);

  useEffect(() => {
    const savedPrompt = localStorage.getItem('calmstories_write_prompt');
    if (savedPrompt) {
      try {
        const p = JSON.parse(savedPrompt);
        if (p?.prompt) setText(`${p.prompt}\n\n`);
        if (p?._id) promptIdRef.current = p._id;
      } catch (e) { /* ignore malformed prompt */ }
      localStorage.removeItem('calmstories_write_prompt');
    }
    Promise.all([checkPublishStatus(), loadDrafts()])
      .finally(() => setRawLoading(false));
  }, []);

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    if (title || text) {
      setAutoSaveStatus('Saving...');
      autoSaveTimer.current = setTimeout(async () => {
        try {
          const result = await saveDraft(title, text, draftIdRef.current || currentDraftId, promptIdRef.current);
          if (result.success) {
            draftIdRef.current = result.draft._id;
            if (!currentDraftId) setCurrentDraftId(result.draft._id);
            setAutoSaveStatus('Saved');
            setTimeout(() => setAutoSaveStatus(''), 2000);
          }
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }, 2000);
    }
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [title, text, currentDraftId]);

  const checkPublishStatus = async () => {
    try {
      const status = await checkCanWrite();
      setCanPublish(status.canWrite);
      setTimeUntilNext((status.timeRemaining || 0) * 1000);
    } catch (error) {
      console.error('Failed to check publish status:', error);
    }
  };

  const loadDrafts = async () => {
    try {
      const result = await fetchDrafts();
      setDrafts(result.drafts || []);
    } catch (error) {
      console.error('Failed to load drafts:', error);
    }
  };

  const formatTimeUntilNext = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    const titleWords = title.trim().split(/\s+/).filter(w => w.length > 0);
    if (titleWords.length < 3) { setError('Title must contain at least 3 words.'); return; }
    if (!text.trim()) { setError('Please write your story before publishing.'); return; }
    if (!canPublish) { setError(`You can publish again in ${formatTimeUntilNext(timeUntilNext)}`); return; }

    setSending(true);
    setError('');
    try {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      const saveResult = await saveDraft(title.trim(), text.trim(), draftIdRef.current || currentDraftId, promptIdRef.current);
      if (!saveResult?.success || !saveResult.draft?._id) {
        setError(saveResult?.error || 'Failed to save draft before publishing');
        return;
      }
      draftIdRef.current = saveResult.draft._id;
      setCurrentDraftId(saveResult.draft._id);
      const result = await publishDraft(saveResult.draft._id);
      if (result.success) {
        setTitle('');
        setText('');
        setCurrentDraftId(null);
        draftIdRef.current = null;
        promptIdRef.current = null;
        cacheClearPrefix('feed:');
        if (result.storyId) sessionStorage.setItem('cw_highlight_story', result.storyId);
        toast.success('Story published');
        onBack();
      } else {
        setError(result.error || 'Failed to publish story');
      }
    } catch (error) {
      setError(error.message || 'Failed to publish story');
    } finally {
      setSending(false);
    }
  };

  const handleLoadDraft = (draft) => {
    setTitle(draft.title || '');
    setText(draft.text || '');
    setCurrentDraftId(draft._id);
    draftIdRef.current = draft._id;
    promptIdRef.current = draft.promptId || null;
    setShowDrafts(false);
  };

  const handleDeleteDraft = (draftId, e) => {
    e.stopPropagation();
    setDraftToDelete(draftId);
  };

  const confirmDeleteDraft = async () => {
    if (!draftToDelete) return;
    setDeleting(true);
    try {
      await deleteDraft(draftToDelete);
      await loadDrafts();
      if (currentDraftId === draftToDelete) {
        setTitle('');
        setText('');
        setCurrentDraftId(null);
        draftIdRef.current = null;
        promptIdRef.current = null;
      }
      toast.success('Draft deleted');
      setDraftToDelete(null);
    } catch (error) {
      console.error('Failed to delete draft:', error);
      toast.error('Failed to delete draft');
    } finally {
      setDeleting(false);
    }
  };

  const handleNewDraft = () => {
    setTitle('');
    setText('');
    setCurrentDraftId(null);
    draftIdRef.current = null;
    promptIdRef.current = null;
    setShowDrafts(false);
  };

  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

  if (loading) return <SkeletonWriteScreen />;

  return (
    <div className="write-screen">
      <div className="write-screen__inner">
        {/* Top bar */}
        <div className="write-screen__topbar">
          <button onClick={onBack} className="btn-back">← Back</button>

          <div className="write-screen__topbar-actions">
            {autoSaveStatus && (
              <span className="write-screen__autosave">{autoSaveStatus}</span>
            )}
            <button
              onClick={() => setShowDrafts(!showDrafts)}
              className="btn btn--secondary"
            >
              {showDrafts ? 'Hide' : 'My Drafts'} ({drafts.length})
            </button>
            <button onClick={handleNewDraft} className="btn btn--secondary">
              New Draft
            </button>
          </div>
        </div>

        {/* Drafts panel */}
        {showDrafts && (
          <div className="write-screen__drafts-panel">
            <h3 className="write-screen__drafts-title">Your Drafts</h3>
            {drafts.length === 0 ? (
              <p className="write-screen__drafts-empty">No drafts yet. Start writing!</p>
            ) : (
              <div className="write-screen__draft-list">
                {drafts.map(draft => (
                  <div
                    key={draft._id}
                    onClick={() => handleLoadDraft(draft)}
                    className={`write-screen__draft-item${currentDraftId === draft._id ? ' write-screen__draft-item--active' : ''}`}
                  >
                    <div style={{ flex: 1 }}>
                      <div className="write-screen__draft-name">{draft.title || 'Untitled Draft'}</div>
                      <div className="write-screen__draft-meta">
                        {draft.wordCount} words · {new Date(draft.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteDraft(draft._id, e)}
                      className="write-screen__draft-delete"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Writing form */}
        <form onSubmit={handlePublish} className="write-screen__form">
          <div className="form-group">
            <label className="write-screen__form-label">
              Title (required — at least 3 words)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="write-screen__title-input"
              placeholder="Enter your story title (at least 3 words)..."
              maxLength={100}
            />
          </div>

          <textarea
            className="write-screen__body-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Begin writing here... Your draft auto-saves as you type."
          />

          <div className="write-screen__footer">
            <div className="write-screen__word-count">
              {wordCount} words
              {title.trim() && (
                <span style={{ marginLeft: '12px' }}>
                  Title: {title.trim().split(/\s+/).filter(w => w.length > 0).length} words
                </span>
              )}
            </div>

            <button
              type="submit"
              className={`write-screen__publish-btn${sending ? ' btn--loading' : ''}`}
              disabled={sending || !text.trim() || !title.trim() || !canPublish}
            >
              {sending && <span className="spinner-ring" aria-hidden="true" />}
              {sending ? 'Publishing…' : (canPublish ? 'Publish' : `Publish in ${formatTimeUntilNext(timeUntilNext)}`)}
            </button>
          </div>

          {!canPublish && (
            <div className="write-screen__cooldown-msg">
              You can keep writing drafts! Publishing is available in {formatTimeUntilNext(timeUntilNext)}.
            </div>
          )}
          {error && <div className="write-screen__error">{error}</div>}
          {success && <div className="write-screen__success">{success}</div>}
        </form>

        <ConfirmDialog
          open={!!draftToDelete}
          title="Delete this draft?"
          message="This cannot be undone."
          confirmLabel="Delete"
          destructive
          busy={deleting}
          onConfirm={confirmDeleteDraft}
          onCancel={() => { if (!deleting) setDraftToDelete(null); }}
        />
      </div>
    </div>
  );
}