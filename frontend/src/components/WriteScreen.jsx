import React, { useState, useEffect, useRef } from 'react';
import { saveDraft, fetchDrafts, deleteDraft, publishDraft, checkCanWrite } from '../api/api';

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

  const autoSaveTimer = useRef(null);

  useEffect(() => {
    checkPublishStatus();
    loadDrafts();
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    if (title || text) {
      setAutoSaveStatus('Saving...');
      autoSaveTimer.current = setTimeout(async () => {
        try {
          const result = await saveDraft(title, text, currentDraftId);
          if (result.success) {
            if (!currentDraftId) {
              setCurrentDraftId(result.draft._id);
            }
            setAutoSaveStatus('Saved');
            setTimeout(() => setAutoSaveStatus(''), 2000);
          }
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }, 2000); // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [title, text, currentDraftId]);

  const checkPublishStatus = async () => {
    try {
      const status = await checkCanWrite();
      setCanPublish(status.canWrite);
      setTimeUntilNext(status.timeUntilNext || 0);
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

    // Validate title (must have at least 3 words)
    const titleWords = title.trim().split(/\s+/).filter(word => word.length > 0);
    if (titleWords.length < 3) {
      setError('Title must contain at least 3 words.');
      return;
    }

    if (!text.trim()) {
      setError('Please write your story before publishing.');
      return;
    }

    if (!canPublish) {
      setError(`You can publish again in ${formatTimeUntilNext(timeUntilNext)}`);
      return;
    }

    setSending(true);
    setError('');

    try {
      // Save as draft first if not already saved
      let draftIdToPublish = currentDraftId;
      if (!currentDraftId) {
        const saveResult = await saveDraft(title.trim(), text.trim());
        if (saveResult.success) {
          draftIdToPublish = saveResult.draft._id;
        }
      }

      // Publish the draft
      const result = await publishDraft(draftIdToPublish);
      if (result.success) {
        setSuccess('Story published successfully!');
        setTitle('');
        setText('');
        setCurrentDraftId(null);
        await loadDrafts();
        setTimeout(() => {
          onBack();
        }, 1500);
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
    setShowDrafts(false);
  };

  const handleDeleteDraft = async (draftId, e) => {
    e.stopPropagation();
    if (confirm('Delete this draft?')) {
      try {
        await deleteDraft(draftId);
        await loadDrafts();
        if (currentDraftId === draftId) {
          setTitle('');
          setText('');
          setCurrentDraftId(null);
        }
      } catch (error) {
        console.error('Failed to delete draft:', error);
      }
    }
  };

  const handleNewDraft = () => {
    setTitle('');
    setText('');
    setCurrentDraftId(null);
    setShowDrafts(false);
  };

  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fefefd',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#666',
              fontSize: '0.9em',
              cursor: 'pointer'
            }}>
            ← Back
          </button>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {autoSaveStatus && (
              <span style={{ fontSize: '0.85em', color: '#666', opacity: 0.7 }}>
                {autoSaveStatus}
              </span>
            )}
            <button
              onClick={() => setShowDrafts(!showDrafts)}
              style={{
                padding: '8px 16px',
                background: '#f0f0f0',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: '0.9em'
              }}>
              {showDrafts ? 'Hide' : 'My Drafts'} ({drafts.length})
            </button>
            <button
              onClick={handleNewDraft}
              style={{
                padding: '8px 16px',
                background: '#e8e8e8',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: '0.9em'
              }}>
              New Draft
            </button>
          </div>
        </div>

        {showDrafts && (
          <div style={{
            background: '#f9f9f9',
            padding: '20px',
            borderRadius: 8,
            marginBottom: '20px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1em' }}>Your Drafts</h3>
            {drafts.length === 0 ? (
              <p style={{ opacity: 0.6, fontSize: '0.9em' }}>No drafts yet. Start writing!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {drafts.map(draft => (
                  <div
                    key={draft._id}
                    onClick={() => handleLoadDraft(draft)}
                    style={{
                      background: currentDraftId === draft._id ? '#e8f4f8' : '#fff',
                      padding: '12px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      border: currentDraftId === draft._id ? '2px solid #4a9eff' : '1px solid #ddd',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start'
                    }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '0.95em' }}>
                        {draft.title || 'Untitled Draft'}
                      </div>
                      <div style={{ fontSize: '0.85em', opacity: 0.7 }}>
                        {draft.wordCount} words · {new Date(draft.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteDraft(draft._id, e)}
                      style={{
                        background: '#ff4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 8px',
                        fontSize: '0.8em',
                        cursor: 'pointer'
                      }}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={handlePublish}
          style={{
            padding: 32,
            boxShadow: '0 1px 4px #eee',
            background: '#fafbf9',
            borderRadius: 8
          }}>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.9em',
              opacity: 0.7
            }}>
              Title (required - at least 3 words)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1.1em',
                fontFamily: 'Georgia, serif'
              }}
              placeholder="Enter your story title (at least 3 words)..."
              maxLength={100}
            />
          </div>

          <textarea
            style={{
              width: '100%',
              height: 300,
              fontSize: '1.1em',
              border: 'none',
              background: 'transparent',
              resize: 'none',
              outline: 'none',
              fontFamily: 'Georgia, serif',
              lineHeight: '1.6'
            }}
            maxLength={4800}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Begin writing here... Your draft auto-saves as you type."
          />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 20
          }}>
            <div style={{
              fontSize: '0.9em',
              opacity: 0.6
            }}>
              {wordCount} words {wordCount > 800 && '(consider keeping under 800)'}
              {title.trim() && (
                <span style={{ marginLeft: '12px' }}>
                  Title: {title.trim().split(/\s+/).filter(word => word.length > 0).length} words
                </span>
              )}
            </div>

            <button
              type="submit"
              style={{
                padding: '12px 40px',
                background: sending ? '#bbb' : (canPublish ? '#222' : '#888'),
                color: '#fff',
                borderRadius: 4,
                border: 'none',
                cursor: sending || !canPublish ? 'not-allowed' : 'pointer',
                fontSize: '1em'
              }}
              disabled={sending || !text.trim() || !title.trim() || !canPublish}>
              {sending ? 'Publishing...' : (canPublish ? 'Publish' : `Publish in ${formatTimeUntilNext(timeUntilNext)}`)}
            </button>
          </div>

          {!canPublish && (
            <div style={{
              color: '#666',
              marginTop: 12,
              fontSize: '0.85em',
              fontStyle: 'italic'
            }}>
              You can keep writing drafts! Publishing is available in {formatTimeUntilNext(timeUntilNext)}.
            </div>
          )}

          {error && (
            <div style={{
              color: '#dd4444',
              marginTop: 12,
              fontSize: '0.9em'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              color: '#44dd44',
              marginTop: 12,
              fontSize: '0.9em'
            }}>
              {success}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}