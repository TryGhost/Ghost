const PostPresenceService = require('./post-presence-service');

const service = new PostPresenceService();
service.PRESENCE_EVENT_TYPES = PostPresenceService.PRESENCE_EVENT_TYPES;

module.exports = service;
