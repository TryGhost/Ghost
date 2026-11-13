import type { Controller, Frame } from '@tryghost/api-framework';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

const models = require('../../models');

const messages = {
  onlyOwner: 'Only the site owner can disconnect Social Web.',
};

type DisconnectFrame = Frame<{
  options: {
    context: {
      user?: string;
    };
  };
}>;

/**
 * Soft-disconnect Social Web without flipping the Network (`social_web`) setting.
 * Used by Remove account so Get Started can reconnect the same identity later.
 */
const controller = {
  docName: 'activitypub',

  disconnect: {
    statusCode: 204,
    headers: {
      cacheInvalidate: false,
    },
    async permissions(frame: DisconnectFrame) {
      const owner = await models.User.findOne({ role: 'Owner', status: 'all' });
      if (owner.id !== frame.options.context.user) {
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
} satisfies Controller<{
  disconnect: DisconnectFrame;
}>;

module.exports = controller;
