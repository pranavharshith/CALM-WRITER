const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth-consolidated');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

// GET /notifications - Fetch notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const total = await Notification.countDocuments({ userInternalId: req.internalId });
    const notifications = await Notification.find({ userInternalId: req.internalId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      notifications: notifications.map(n => ({
        _id: n._id,
        type: n.type,
        message: n.message,
        read: n.read,
        storyId: n.storyId,
        fromUserId: n.fromUserId,
        fromUsername: n.fromUsername,
        storyTitle: n.storyTitle,
        createdAt: n.createdAt
      })),
      pagination: getPaginationMeta(total, page, limit)
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// GET /notifications/unread-count - Get unread count
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userInternalId: req.internalId,
      read: false
    });

    res.json({
      success: true,
      unreadCount: count,
      count
    });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

// POST /notifications/:notificationId/read - Mark as read
router.post('/:notificationId/read', requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.notificationId);
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    if (notification.userInternalId !== req.internalId) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    notification.read = true;
    await notification.save();

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

// POST /notifications/mark-all-read - Mark all as read
router.post('/mark-all-read', requireAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userInternalId: req.internalId, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all notifications as read' });
  }
});

module.exports = router;
