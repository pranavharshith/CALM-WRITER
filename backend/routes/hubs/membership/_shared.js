const express = require('express');
const CollaborativeHub = require('../../../models/CollaborativeHub');
const HubInvite = require('../../../models/HubInvite');
const HubJoinRequest = require('../../../models/HubJoinRequest');
const HubChat = require('../../../models/HubChat');
const User = require('../../../models/User');
const { requireAuth } = require('../../../middleware/auth');

function isHubMember(hub, userInternalId) {
    return hub.members.some(m => m.userInternalId === userInternalId && m.isActive !== false);
}

function isHubModerator(hub, userInternalId) {
    const member = hub.members.find(m => m.userInternalId === userInternalId && m.isActive !== false);
    return member && (member.role === 'creator' || member.role === 'moderator');
}

module.exports = {
  express, CollaborativeHub, HubInvite, HubJoinRequest, HubChat, User, requireAuth,
  isHubMember, isHubModerator,
};
