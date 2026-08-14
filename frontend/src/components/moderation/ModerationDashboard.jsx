import React, { useState, useEffect, useRef } from 'react';
import {
  fetchReports,
  removeStory,
  removeNode,
  lockThread,
  pinComment,
  dismissReport,
  fetchModeratorChat,
  postModeratorChat,
  fetchTimeoutAppeals,
  reviewTimeoutAppeal
} from '../../api/api';
import useRegionLoading from '../../hooks/useRegionLoading';
import ReportsPanel from './ReportsPanel';
import AppealsPanel from './AppealsPanel';
import ModChatPanel from './ModChatPanel';
import ActionDialog from './ActionDialog';
import useToast from '../../hooks/useToast';

export default function ModerationDashboard({ user, onBack }) {
  const [activeTab, setActiveTab] = useState('reports'); // 'reports', 'appeals', 'chat'
  const [reports, setReports] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [tabBusy, setTabBusy] = useState({ reports: true, appeals: false, chat: false });
  const reportsLoading = useRegionLoading(tabBusy.reports, 280);
  const appealsLoading = useRegionLoading(tabBusy.appeals, 280);
  const chatLoading = useRegionLoading(tabBusy.chat, 280);
  const warmed = useRef({ reports: false, appeals: false, chat: false });
  const lastReportFilter = useRef(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actioningReport, setActioningReport] = useState(null);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [pinCommentText, setPinCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const toast = useToast();

  useEffect(() => {
    if (activeTab === 'reports') {
      const silent = warmed.current.reports && lastReportFilter.current === statusFilter;
      lastReportFilter.current = statusFilter;
      loadReports({ silent });
    } else if (activeTab === 'appeals') {
      loadAppeals({ silent: warmed.current.appeals });
    } else if (activeTab === 'chat') {
      loadChat({ silent: warmed.current.chat });
    }
  }, [statusFilter, activeTab]);

  const loadReports = async ({ silent = false } = {}) => {
    try {
      if (!silent) setTabBusy(b => ({ ...b, reports: true }));
      const result = await fetchReports(statusFilter);
      setReports(result.reports || []);
      warmed.current.reports = true;
    } catch (err) {
      setError('Failed to load reports');
      console.error(err);
    } finally {
      setTabBusy(b => ({ ...b, reports: false }));
    }
  };

  const loadAppeals = async ({ silent = false } = {}) => {
    try {
      if (!silent) setTabBusy(b => ({ ...b, appeals: true }));
      const result = await fetchTimeoutAppeals(statusFilter);
      setAppeals(result.appeals || []);
      warmed.current.appeals = true;
    } catch (err) {
      setError('Failed to load appeals');
      console.error(err);
    } finally {
      setTabBusy(b => ({ ...b, appeals: false }));
    }
  };

  const loadChat = async ({ silent = false } = {}) => {
    try {
      if (!silent) setTabBusy(b => ({ ...b, chat: true }));
      const result = await fetchModeratorChat(50);
      setChatMessages(result.messages || []);
      warmed.current.chat = true;
    } catch (err) {
      setError('Failed to load chat');
      console.error(err);
    } finally {
      setTabBusy(b => ({ ...b, chat: false }));
    }
  };

  const handleSendChat = async () => {
    if (!chatMessage.trim()) return;
    const text = chatMessage;
    const optimisticId = `opt-${Date.now()}`;
    setChatMessages(prev => [...prev, {
      _id: optimisticId,
      senderInternalId: user && user.internalId,
      senderUsername: user && user.username,
      message: text,
    }]);
    setChatMessage('');
    setChatSending(true);
    try {
      await postModeratorChat(text);
      toast.success('Message sent');
      const result = await fetchModeratorChat(50);
      setChatMessages(result.messages || []);
    } catch (err) {
      setChatMessages(prev => prev.filter(m => m._id !== optimisticId));
      setError(err.message || 'Failed to send message');
      toast.error('Failed to send message');
    } finally {
      setChatSending(false);
    }
  };

  const handleAppealReview = async (appeal, decision) => {
    setSubmitting(true);
    setError('');
    try {
      await reviewTimeoutAppeal(appeal._id, decision, 'Reviewed by moderator');
      await loadAppeals({ silent: true });
    } catch (err) {
      setError(err.message || 'Failed to review appeal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppealConfirm = (appeal) => handleAppealReview(appeal, 'timeout_confirmed');
  const handleAppealCancel = (appeal) => handleAppealReview(appeal, 'timeout_cancelled');

  const handleAction = async (report, action) => {
    setActioningReport(report);
    setActionType(action);
    setActionReason('');
    setPinCommentText('');
  };

  const handleCancelAction = () => {
    setActioningReport(null);
    setActionType('');
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
      await loadReports({ silent: true });
    } catch (err) {
      setError('Failed to execute action');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || !['moderator', 'admin'].includes(user.role)) {
    return (
      <div className="page-shell" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Access denied</p>
        <button onClick={onBack} style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.8em', fontWeight: '500', color: 'var(--text-primary)', margin: 0 }}>
            Moderation Dashboard
          </h1>
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: '0.9em',
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)'
            }}>
            Back to Feed
          </button>
        </div>

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

        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px'
        }}>
          {['reports', 'appeals', 'chat'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                background: activeTab === tab ? 'var(--sage-dark)' : 'transparent',
                color: activeTab === tab ? 'var(--sage-contrast)' : 'var(--text-secondary)',
                border: activeTab === tab ? 'none' : '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9em',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'reports' && (
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
                background: statusFilter === status ? 'var(--sage-dark)' : 'transparent',
                color: statusFilter === status ? 'var(--sage-contrast)' : 'var(--text-secondary)',
                border: statusFilter === status ? 'none' : '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9em',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}>
              {status}
            </button>
          ))}
        </div>
        )}

        {activeTab === 'appeals' && (
          <AppealsPanel
            appeals={appeals}
            appealsLoading={appealsLoading}
            statusFilter={statusFilter}
            submitting={submitting}
            user={user}
            onConfirm={handleAppealConfirm}
            onCancel={handleAppealCancel}
          />
        )}

        {activeTab === 'chat' && (
          <ModChatPanel
            user={user}
            chatMessages={chatMessages}
            chatLoading={chatLoading}
            chatMessage={chatMessage}
            setChatMessage={setChatMessage}
            submitting={chatSending}
            onSend={handleSendChat}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsPanel
            reports={reports}
            reportsLoading={reportsLoading}
            statusFilter={statusFilter}
            onAction={handleAction}
          />
        )}

        {actioningReport && (
          <ActionDialog
            actionType={actionType}
            actionReason={actionReason}
            setActionReason={setActionReason}
            pinCommentText={pinCommentText}
            setPinCommentText={setPinCommentText}
            submitting={submitting}
            onSubmit={executeAction}
            onCancel={handleCancelAction}
          />
        )}
      </div>
    </div>
  );
}
