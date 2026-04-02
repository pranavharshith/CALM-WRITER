import React, { useState, useEffect } from 'react';
import { fetchThread, continueStory, respondToStory, fetchPinnedComments, reportContent } from '../api/api';
import { SkeletonThreadView } from './SkeletonLoader';
import useMinLoadTime from '../hooks/useMinLoadTime';

export default function ThreadView({ storyId, user, onBack }) {
  const [thread, setThread] = useState(null);
  const [pinnedComments, setPinnedComments] = useState([]);
  const [rawLoading, setRawLoading] = useState(true);
  const loading = useMinLoadTime(rawLoading, 1000);
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

  const loadThread = async () => {
    try {
      setRawLoading(true);
      const data = await fetchThread(storyId);
      setThread(data);
    } catch (err) {
      setError('Failed to load thread');
      console.error(err);
    } finally {
      setRawLoading(false);
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
    if (!continueContent.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      const result = await continueStory(storyId, continueContent);
      if (result.success) {
        setContinueContent('');
        setShowContinueForm(false);
        await loadThread();
      } else {
        setError(result.error || 'Failed to add continuation');
      }
    } catch (err) {
      setError('Failed to add continuation');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async () => {
    if (!responseContent.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      const result = await respondToStory(storyId, responseContent);
      if (result.success) {
        setResponseContent('');
        setShowResponseForm(false);
        await loadThread();
      } else {
        setError(result.error || 'Failed to add response');
      }
    } catch (err) {
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
      await reportContent(
        reportTarget.type === 'story' ? reportTarget.id : null,
        reportTarget.type === 'node' ? reportTarget.id : null,
        reportReason,
        reportDetails
      );
      setShowReportForm(false);
      setReportTarget(null);
      setReportDetails('');
      alert('Report submitted. Thank you.');
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
      <div style={{ padding: '40px', textAlign: 'center', background: '#fefefd', minHeight: '100vh' }}>
        <p style={{ color: '#666' }}>Thread not found</p>
        <button onClick={onBack} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>
          Back
        </button>
      </div>
    );
  }

  const isModerator = user && ['moderator', 'admin'].includes(user.role);
  const wordCount = (text) => text.trim().split(/\s+/).length;

  return (
    <div style={{ minHeight: '100vh', background: '#fefefd', padding: '20px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#666',
            fontSize: '0.9em',
            cursor: 'pointer',
            marginBottom: '24px'
          }}>
          ← Back to feed
        </button>

        {error && (
          <div style={{
            background: '#f8d7da',
            color: '#721c24',
            padding: '12px 16px',
            borderRadius: '4px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {/* Pinned Moderator Comments */}
        {pinnedComments.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            {pinnedComments.map((comment) => (
              <div key={comment.nodeId} style={{
                background: '#fff9e6',
                border: '1px solid #f0e68c',
                borderRadius: '6px',
                padding: '16px',
                marginBottom: '12px'
              }}>
                <div style={{ fontSize: '0.85em', color: '#856404', marginBottom: '8px', fontWeight: '500' }}>
                  📌 Moderator Note
                </div>
                <div style={{ fontSize: '0.95em', lineHeight: '1.6', color: '#333', whiteSpace: 'pre-wrap' }}>
                  {comment.content}
                </div>
                <div style={{ fontSize: '0.8em', color: '#999', marginTop: '8px' }}>
                  — {comment.moderatorUsername}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Original Story */}
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '32px',
          boxShadow: '0 1px 8px #efefee',
          marginBottom: '24px'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <span style={{ color: '#666', fontSize: '0.9em' }}>
              @{thread.story.authorUsername}
              {thread.story.authorRole === 'moderator' && (
                <span style={{ marginLeft: '8px', fontSize: '0.8em', color: '#5a67d8', fontWeight: '500' }}>
                  ⚡ Moderator
                </span>
              )}
            </span>
          </div>

          {thread.story.title && (
            <h2 style={{
              fontSize: '1.4em',
              fontWeight: '500',
              marginBottom: '16px',
              color: '#333',
              lineHeight: '1.4'
            }}>
              {thread.story.title}
            </h2>
          )}

          <div style={{
            fontSize: '1.1em',
            lineHeight: '1.72',
            whiteSpace: 'pre-wrap',
            color: '#333',
            marginBottom: '16px'
          }}>
            {thread.story.text}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button
              onClick={() => openReportForm('story', thread.story._id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#999',
                fontSize: '0.85em',
                cursor: 'pointer',
                padding: '4px 8px'
              }}>
              Report
            </button>
          </div>
        </div>

        {/* Thread Locked Notice */}
        {thread.threadLocked && (
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '20px',
            fontSize: '0.9em',
            color: '#856404'
          }}>
            🔒 This thread has been locked by moderators
          </div>
        )}

        {/* Continuations */}
        {thread.continuations && thread.continuations.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              fontSize: '0.95em',
              color: '#666',
              marginBottom: '12px',
              fontWeight: '500',
              letterSpacing: '0.5px'
            }}>
              This story continues
            </div>

            {thread.continuations.map((continuation, idx) => (
              <div key={continuation._id} style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '24px',
                boxShadow: '0 1px 6px #f5f5f5',
                marginBottom: '16px',
                borderLeft: '3px solid #e0e0e0'
              }}>
                <div style={{ marginBottom: '12px', fontSize: '0.85em', color: '#999' }}>
                  Chapter {idx + 2}
                </div>
                <div style={{
                  fontSize: '1.05em',
                  lineHeight: '1.72',
                  whiteSpace: 'pre-wrap',
                  color: '#333'
                }}>
                  {continuation.content}
                </div>
                <div style={{ marginTop: '12px' }}>
                  <button
                    onClick={() => openReportForm('node', continuation._id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#999',
                      fontSize: '0.8em',
                      cursor: 'pointer',
                      padding: '4px 8px'
                    }}>
                    Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Continue Button (Original Author Only) */}
        {thread.isOriginalAuthor && !thread.threadLocked && !showContinueForm && (
          <button
            onClick={() => setShowContinueForm(true)}
            style={{
              background: '#374',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 24px',
              fontSize: '0.95em',
              cursor: 'pointer',
              marginBottom: '24px'
            }}>
            Continue this story
          </button>
        )}

        {/* Continue Form */}
        {showContinueForm && (
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 8px #efefee',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '1.1em', marginBottom: '12px', color: '#333' }}>
              Continue your story
            </div>
            <textarea
              value={continueContent}
              onChange={(e) => setContinueContent(e.target.value)}
              placeholder="Write the next chapter..."
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '16px',
                fontSize: '1em',
                lineHeight: '1.6',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'Georgia, serif',
                resize: 'vertical'
              }}
            />
            <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={handleContinue}
                disabled={submitting || wordCount(continueContent) > 800}
                style={{
                  background: wordCount(continueContent) > 800 ? '#ccc' : '#374',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  cursor: wordCount(continueContent) > 800 ? 'not-allowed' : 'pointer'
                }}>
                {submitting ? 'Adding...' : 'Add Chapter'}
              </button>
              <button
                onClick={() => {
                  setShowContinueForm(false);
                  setContinueContent('');
                }}
                style={{
                  background: 'transparent',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  cursor: 'pointer'
                }}>
                Cancel
              </button>
              <span style={{ fontSize: '0.85em', color: wordCount(continueContent) > 800 ? '#c7968c' : '#999' }}>
                {wordCount(continueContent)} / 800 words
              </span>
            </div>
          </div>
        )}

        {/* Responses Section */}
        {thread.responses && thread.responses.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={() => setShowResponses(!showResponses)}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
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
                  <div key={response._id} style={{
                    background: '#fafafa',
                    borderRadius: '6px',
                    padding: '16px',
                    marginBottom: '12px',
                    fontSize: '0.95em'
                  }}>
                    <div style={{ marginBottom: '8px', fontSize: '0.85em', color: '#666' }}>
                      @{response.authorUsername}
                      {response.authorRole === 'moderator' && (
                        <span style={{ marginLeft: '6px', fontSize: '0.8em', color: '#5a67d8' }}>
                          ⚡
                        </span>
                      )}
                    </div>
                    <div style={{
                      lineHeight: '1.6',
                      color: '#444',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {response.content}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <button
                        onClick={() => openReportForm('node', response._id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#999',
                          fontSize: '0.75em',
                          cursor: 'pointer',
                          padding: '4px 8px'
                        }}>
                        Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Respond Button */}
        {!thread.threadLocked && !showResponseForm && (
          <button
            onClick={() => setShowResponseForm(true)}
            style={{
              background: 'transparent',
              color: '#666',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '10px 20px',
              fontSize: '0.9em',
              cursor: 'pointer',
              marginBottom: '24px'
            }}>
            Add a reflection
          </button>
        )}

        {/* Response Form */}
        {showResponseForm && (
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 8px #efefee',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '1em', marginBottom: '12px', color: '#333' }}>
              Share your reflection
            </div>
            <textarea
              value={responseContent}
              onChange={(e) => setResponseContent(e.target.value)}
              placeholder="What did this story mean to you?"
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '16px',
                fontSize: '0.95em',
                lineHeight: '1.6',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'Georgia, serif',
                resize: 'vertical'
              }}
            />
            <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={handleRespond}
                disabled={submitting || wordCount(responseContent) > 800}
                style={{
                  background: wordCount(responseContent) > 800 ? '#ccc' : '#374',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  cursor: wordCount(responseContent) > 800 ? 'not-allowed' : 'pointer'
                }}>
                {submitting ? 'Adding...' : 'Add Reflection'}
              </button>
              <button
                onClick={() => {
                  setShowResponseForm(false);
                  setResponseContent('');
                }}
                style={{
                  background: 'transparent',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  cursor: 'pointer'
                }}>
                Cancel
              </button>
              <span style={{ fontSize: '0.85em', color: wordCount(responseContent) > 800 ? '#c7968c' : '#999' }}>
                {wordCount(responseContent)} / 800 words
              </span>
            </div>
          </div>
        )}

        {/* Report Form Modal */}
        {showReportForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.2em' }}>Report Content</h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', color: '#666' }}>
                  Reason
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '0.95em',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}>
                  <option value="spam">Spam</option>
                  <option value="hate">Hate Speech</option>
                  <option value="harassment">Harassment</option>
                  <option value="explicit_harm">Explicit Harm</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', color: '#666' }}>
                  Additional Details (optional)
                </label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide more context..."
                  style={{
                    width: '100%',
                    minHeight: '100px',
                    padding: '10px',
                    fontSize: '0.9em',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'Georgia, serif',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleReport}
                  disabled={submitting}
                  style={{
                    background: '#c7968c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}>
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
                <button
                  onClick={() => {
                    setShowReportForm(false);
                    setReportTarget(null);
                    setReportDetails('');
                  }}
                  style={{
                    background: 'transparent',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    cursor: 'pointer'
                  }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
