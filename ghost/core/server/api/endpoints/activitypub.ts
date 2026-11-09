import type { Controller, Frame } from '@tryghost/api-framework';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

const messages = {
  onlyOwner: 'Only the site owner can disconnect Social Web.',
};

type DisconnectFrame = Frame<{
  user: {
    load: (relations: string[]) => Promise<unknown>;
    related: (name: string) => { models: Array<{ get: (attr: string) => string }> };
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
      await frame.user.load(['roles']);
      const role = frame.user.related('roles').models[0];

      if (!role || role.get('name') !== 'Owner') {
        throw new errors.NoPermissionError({
          message: tpl(messages.onlyOwner),
        });
      }
    },
    async query() {
      // CJS service wrapper at the require() boundary
      const ActivityPubService = require('../../services/activitypub');
      await ActivityPubService.disconnect();
    },
  },
} satisfies Controller<{
  disconnect: DisconnectFrame;
}>;

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
