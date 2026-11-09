import type { Controller, Frame } from '@tryghost/api-framework';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';

const messages = {
  onlyOwner: 'Only the site owner can disconnect Social Web.',
};

type DisconnectFrame = Frame;

type ApiUser = {
  load: (relations: string[]) => Promise<unknown>;
  hasRole: (roleName: string) => boolean;
};

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
      const user = frame.user as ApiUser;
      await user.load(['roles']);

      if (!user.hasRole('Owner')) {
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
