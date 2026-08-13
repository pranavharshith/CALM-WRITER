import React, { useState, useEffect } from 'react';
import { fetchThread, continueStory, respondToStory, fetchPinnedComments, reportContent } from '../api/api';
import { SkeletonThreadView } from './SkeletonLoader';
import useMinLoadTime from '../hooks/useMinLoadTime';
import useToast from '../hooks/useToast';
import ThreadCard from './thread/ThreadCard';
import ThreadCompose from './thread/ThreadCompose';
import ThreadReportForm from './thread/ThreadReportForm';
import ThreadPinned from './thread/ThreadPinned';
import ThreadStory from './thread/ThreadStory';

export default function ThreadView({ storyId, user, onBack }) {
  const [thread, setThread] = useState(null);
  const [pinnedComments, setPinnedComments] = useState([]);
  const [rawLoading, setRawLoading] = useState(true);
  const loading = useMinLoadTime(rawLoading);
  const toast = useToast();
  const [showContinueForm, setShowContinueForm] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [continueContent, setContinueContent] = useState('');
  const [responseContent, setResponseContent] = useState('');
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showResponses, setShowResponses] = useState(false);

  useEffect(() => {
    loadThread();
    loadPinnedComments();
  }, [storyId]);

  const loadThread = async ({ silent = false } = {}) => {
    try {
      if (!silent) setRawLoading(true);
      const data = await fetchThread(storyId);
      setThread(data);
    } catch (err) {
      setError('Failed to load thread');
      console.error(err);
    } finally {
      if (!silent) setRawLoading(false);
    }
  };

  const loadPinnedComments = async () => {
    try {
      const data = await fetchPinnedComments(storyId);
      setPinnedComments(data.pinnedComments || []);
    } catch (err) {
      console.error('Failed to load pinned comments:', err);
    }
  };

  const handleContinue = async () => {
    if (!continueContent.trim() || submitting) return;

    const optimisticId = `opt-${Date.now()}`;
    const content = continueContent;
    const optimistic = {
      _id: optimisticId,
      content,
      authorUsername: user?.username,
      authorRole: user?.role,
      optimistic: true,
    };

    setThread(prev => ({
      ...prev,
      continuations: [...(prev.continuations || []), optimistic],
    }));
    setContinueContent('');
    setShowContinueForm(false);
    setError('');
    setSubmitting(true);

    requestAnimationFrame(() => {
      document.getElementById(`thread-card-${optimisticId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });

    try {
      const result = await continueStory(storyId, content);
      if (result.success) {
        toast.success('Chapter added');
        await loadThread({ silent: true });
      } else {
        setThread(prev => ({
          ...prev,
          continuations: (prev.continuations || []).filter(c => c._id !== optimisticId),
        }));
        setError(result.error || 'Failed to add continuation');
      }
    } catch (err) {
      setThread(prev => ({
        ...prev,
        continuations: (prev.continuations || []).filter(c => c._id !== optimisticId),
      }));
      setError('Failed to add continuation');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async () => {
    if (!responseContent.trim() || submitting) return;

    const optimisticId = `opt-${Date.now()}`;
    const content = responseContent;
    const optimistic = {
      _id: optimisticId,
      content,
      authorUsername: user?.username,
      authorRole: user?.role,
      optimistic: true,
    };

    setThread(prev => ({
      ...prev,
      responses: [...(prev.responses || []), optimistic],
    }));
    setResponseContent('');
    setShowResponseForm(false);
    setShowResponses(true);
    setError('');
    setSubmitting(true);

    requestAnimationFrame(() => {
      document.getElementById(`thread-card-${optimisticId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    });

    try {
      const result = await respondToStory(storyId, content);
      if (result.success) {
        toast.success('Reflection added');
        await loadThread({ silent: true });
      } else {
        setThread(prev => ({
          ...prev,
          responses: (prev.responses || []).filter(c => c._id !== optimisticId),
        }));
        setError(result.error || 'Failed to add response');
      }
    } catch (err) {
      setThread(prev => ({
        ...prev,
        responses: (prev.responses || []).filter(c => c._id !== optimisticId),
      }));
      setError('Failed to add response');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!reportTarget) return;

    setSubmitting(true);
    try {
      const result = await reportContent(
        reportTarget.type === 'story' ? reportTarget.id : null,
        reportTarget.type === 'node' ? reportTarget.id : null,
        reportReason,
        reportDetails
      );
      if (!result || result.success === false) {
        setError((result && result.error) || 'Failed to submit report');
        setSubmitting(false);
        return;
      }
      setShowReportForm(false);
      setReportTarget(null);
      setReportDetails('');
      toast.success('Report submitted. Thank you.');
    } catch (err) {
      setError('Failed to submit report');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const openReportForm = (type, id) => {
    setReportTarget({ type, id });
    setShowReportForm(true);
  };

  if (loading) {
    return <SkeletonThreadView />;
  }

  if (!thread) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: 'transparent', minHeight: '100vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Thread not found</p>
        <button onClick={onBack} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: '20px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.9em',
            cursor: 'pointer',
            marginBottom: '24px'
          }}>
          ← Back to feed
        </button>

        {error && (
          <div style={{
            background: 'var(--rose-light)',
            color: 'var(--rose-dark)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        <ThreadPinned comments={pinnedComments} />

        <ThreadStory
          story={thread.story}
          threadLocked={thread.threadLocked}
          onReport={openReportForm}
        />

        {thread.continuations && thread.continuations.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              fontSize: '0.95em',
              color: 'var(--text-secondary)',
              marginBottom: '12px',
              fontWeight: '500',
              letterSpacing: '0.5px'
            }}>
              This story continues
            </div>

            {thread.continuations.map((continuation, idx) => (
              <ThreadCard
                key={continuation._id}
                id={continuation._id}
                variant="continuation"
                chapter={idx + 2}
                content={continuation.content}
                optimistic={continuation.optimistic}
                onReport={() => openReportForm('node', continuation._id)}
              />
            ))}
          </div>
        )}

        <ThreadCompose
          mode="continue"
          canCompose={thread.isOriginalAuthor && !thread.threadLocked}
          showForm={showContinueForm}
          content={continueContent}
          onChange={setContinueContent}
          onShow={() => setShowContinueForm(true)}
          onSubmit={handleContinue}
          onCancel={() => {
            setShowContinueForm(false);
            setContinueContent('');
          }}
          submitting={submitting}
        />

        {thread.responses && thread.responses.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={() => setShowResponses(!showResponses)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.9em',
                cursor: 'pointer',
                marginBottom: '12px',
                padding: '8px 0',
                fontWeight: '500'
              }}>
              {showResponses ? '▼' : '▶'} Reflections from readers ({thread.responses.length})
            </button>

            {showResponses && (
              <div>
                {thread.responses.map((response) => (
                  <ThreadCard
                    key={response._id}
                    id={response._id}
                    variant="response"
                    content={response.content}
                    authorUsername={response.authorUsername}
                    authorRole={response.authorRole}
                    optimistic={response.optimistic}
                    onReport={() => openReportForm('node', response._id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <ThreadCompose
          mode="respond"
          canCompose={!thread.threadLocked}
          showForm={showResponseForm}
          content={responseContent}
          onChange={setResponseContent}
          onShow={() => setShowResponseForm(true)}
          onSubmit={handleRespond}
          onCancel={() => {
            setShowResponseForm(false);
            setResponseContent('');
          }}
          submitting={submitting}
        />

        {showReportForm && (
          <ThreadReportForm
            reason={reportReason}
            details={reportDetails}
            onReasonChange={setReportReason}
            onDetailsChange={setReportDetails}
            onSubmit={handleReport}
            onCancel={() => {
              setShowReportForm(false);
              setReportTarget(null);
              setReportDetails('');
            }}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}
