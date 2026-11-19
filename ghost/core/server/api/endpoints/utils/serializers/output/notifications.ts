import type { Frame } from '@tryghost/api-framework';
import debugFactory from '@tryghost/debug';

const debug = debugFactory('api:endpoints:utils:serializers:output:notifications');

type Notification = {
  seen?: unknown;
  seenBy?: unknown;
  addedAt?: unknown;
  createdAtVersion?: unknown;
};

module.exports = {
  all(response: Notification[] | null | undefined, apiConfig: unknown, frame: Frame) {
    debug('all');
    if (!response) {
      return;
    }

    if (!response || !response.length) {
      frame.response = {
        notifications: [],
      };

      return;
    }

    response.forEach((notification) => {
      delete notification.seen;
      delete notification.seenBy;
      delete notification.addedAt;
      delete notification.createdAtVersion;
    });

    frame.response = {
      notifications: response,
    };
  },
};
