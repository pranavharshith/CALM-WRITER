import React, { useState, useEffect } from 'react';
import { 
  fetchReports, 
  removeStory, 
  removeNode, 
  lockThread, 
  pinComment, 
  dismissReport 
} from '../api/api';

export default function ModerationDashboard({ user, onBack }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actioningReport, setActioningReport] = useState(null);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [pinCommentText, setPinCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const result = await fetchReports(statusFilter);
      setReports(result.reports || []);
    } catch (err) {
      setError('Failed to load reports');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (report, action) => {
    setActioningReport(report);
    setActionType(action);
    setActionReason('');
    setPinCommentText('');
  };

  const executeAction = async () => {
    if (!actioningReport) return;
    
    setSubmitting(true);
    setError('');
    
    try {
      switch (actionType) {
        case 'remove_story':
          await removeStory(
            actioningReport.content.id, 
            actionReason || 'Violates community guidelines',
            actioningReport._id
          );
          break;
        case 'remove_node':
          await removeNode(
            actioningReport.content.id,
            actionReason || 'Violates community guidelines',
            actioningReport._id
          );
          break;
        case 'lock_thread':
          await lockThread(
            actioningReport.storyId,
            actionReason || 'Thread locked by moderator'
          );
          break;
        case 'pin_comment':
          if (!pinCommentText.trim()) {
            setError('Comment text required');
            setSubmitting(false);
            return;
          }
          await pinComment(
            actioningReport.storyId,
            pinCommentText,
            7
          );
          break;
        case 'dismiss':
          await dismissReport(actioningReport._id);
          break;
      }
      
      setActioningReport(null);
      setActionType('');
      await loadReports();
    } catch (err) {
      setError('Failed to execute action');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || !['moderator', 'admin'].includes(user.role)) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: '#fefefd', minHeight: '100vh' }}>
        <p style={{ color: '#666' }}>Access denied</p>
        <button onClick={onBack} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fefefd', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.8em', fontWeight: '500', color: '#333', margin: 0 }}>
            Moderation Dashboard
          </h1>
          <button 
            onClick={onBack}
            style={{
              background: 'transparent',
              border: '1px solid #ddd',
              color: '#666',
              fontSize: '0.9em',
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: '6px'
            }}>
            Back to Feed
          </button>
        </div>

        {error && (
          <div style={{
            background: '#f8d7da',
            color: '#721c24',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {/* Status Filter */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px'
        }}>
          {['pending', 'reviewed', 'actioned', 'dismissed'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '8px 16px',
                background: statusFilter === status ? '#374' : 'transparent',
                color: statusFilter === status ? '#fff' : '#666',
                border: statusFilter === status ? 'none' : '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.9em',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}>
              {status}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            Loading reports...
          </div>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No {statusFilter} reports
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reports.map(report => (
              <div key={report._id} style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 1px 4px #efefee'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <span style={{
                      background: '#f0f0f0',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.8em',
                      color: '#666',
                      textTransform: 'uppercase',
                      fontWeight: '500'
                    }}>
                      {report.reason.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8em', color: '#999' }}>
                    {new Date(report.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '4px' }}>
                    Reported by: @{report.reporterUsername}
                  </div>
                  {report.details && (
                    <div style={{ fontSize: '0.9em', color: '#555', fontStyle: 'italic', marginTop: '8px' }}>
                      "{report.details}"
                    </div>
                  )}
                </div>

                {report.content && (
                  <div style={{
                    background: '#fafafa',
                    padding: '16px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    borderLeft: '3px solid #e0e0e0'
                  }}>
                    {report.contentType === 'story' && report.content.title && (
                      <div style={{ fontSize: '1em', fontWeight: '500', marginBottom: '8px', color: '#333' }}>
                        {report.content.title}
                      </div>
                    )}
                    <div style={{
                      fontSize: '0.9em',
                      lineHeight: '1.6',
                      color: '#555',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {report.content.preview}
                    </div>
                  </div>
                )}

                {report.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleAction(report, report.contentType === 'story' ? 'remove_story' : 'remove_node')}
                      style={{
                        background: '#e74c3c',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '0.85em',
                        cursor: 'pointer'
                      }}>
                      Remove Content
                    </button>
                    
                    {report.contentType === 'story' && (
                      <>
                        <button
                          onClick={() => handleAction(report, 'lock_thread')}
                          style={{
                            background: '#f39c12',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            fontSize: '0.85em',
                            cursor: 'pointer'
                          }}>
                          Lock Thread
                        </button>
                        
                        <button
                          onClick={() => handleAction(report, 'pin_comment')}
                          style={{
                            background: '#3498db',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            fontSize: '0.85em',
                            cursor: 'pointer'
                          }}>
                          Pin Comment
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => handleAction(report, 'dismiss')}
                      style={{
                        background: 'transparent',
                        color: '#666',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '0.85em',
                        cursor: 'pointer'
                      }}>
                      Dismiss
                    </button>
                  </div>
                )}

                {report.status !== 'pending' && (
                  <div style={{ fontSize: '0.85em', color: '#666', fontStyle: 'italic' }}>
                    Status: {report.status}
                    {report.reviewedBy && ` by moderator on ${new Date(report.reviewedAt).toLocaleDateString()}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Modal */}
        {actioningReport && (
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
              <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '1.2em' }}>
                {actionType === 'remove_story' && 'Remove Story'}
                {actionType === 'remove_node' && 'Remove Content'}
                {actionType === 'lock_thread' && 'Lock Thread'}
                {actionType === 'pin_comment' && 'Pin Moderator Comment'}
                {actionType === 'dismiss' && 'Dismiss Report'}
              </h3>

              {actionType !== 'dismiss' && actionType !== 'pin_comment' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', color: '#666' }}>
                    Reason (will be logged)
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Explain why this action is being taken..."
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
              )}

              {actionType === 'pin_comment' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', color: '#666' }}>
                    Comment (will be pinned for 7 days)
                  </label>
                  <textarea
                    value={pinCommentText}
                    onChange={(e) => setPinCommentText(e.target.value)}
                    placeholder="Write a public moderator comment..."
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '10px',
                      fontSize: '0.9em',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontFamily: 'Georgia, serif',
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}

              {actionType === 'dismiss' && (
                <p style={{ fontSize: '0.95em', color: '#666', marginBottom: '20px' }}>
                  This report will be marked as dismissed. No action will be taken on the content.
                </p>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={executeAction}
                  disabled={submitting}
                  style={{
                    background: actionType === 'dismiss' ? '#666' : '#e74c3c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}>
                  {submitting ? 'Processing...' : 'Confirm'}
                </button>
                <button
                  onClick={() => {
                    setActioningReport(null);
                    setActionType('');
                    setActionReason('');
                    setPinCommentText('');
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
