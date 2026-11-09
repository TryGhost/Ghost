const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
  onlyOwner: 'Only the site owner can disconnect Social Web.',
};

/**
 * Soft-disconnect Social Web without flipping the Network (`social_web`) setting.
 * Used by Remove account so Get Started can reconnect the same identity later.
 *
 * @type {import('@tryghost/api-framework').Controller}
 */
const controller = {
  docName: 'activitypub',

  disconnect: {
    statusCode: 204,
    headers: {
      cacheInvalidate: false,
    },
    async permissions(frame) {
      await frame.user.load(['roles']);
      const role = frame.user.related('roles').models[0];

      if (!role || role.get('name') !== 'Owner') {
        throw new errors.NoPermissionError({
          message: tpl(messages.onlyOwner),
        });
      }
    },
    async query() {
      const ActivityPubService = require('../../services/activitypub');
      await ActivityPubService.disconnect();
    },
  },
};

module.exports = controller;
