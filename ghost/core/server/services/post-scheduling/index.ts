import { defineService } from '../../../kernel/define-service';
import type PostSchedulingClass from './post-scheduling';
import type { PostSchedulingEvents } from './post-scheduling';

// Boot initializes this before running the scheduling adapter. The scheduler
// keeps the adapter, Admin API URL and listeners from its first initialization.
export default defineService('Post Scheduling', () => {
  const logging = require('@tryghost/logging');
  const PostScheduling: typeof PostSchedulingClass = require('./post-scheduling').default;
  const internalKeys = require('../internal-keys').default;
  const adapterManager = require('../adapter-manager').default;
  const { withErrorCapture } = require('../../adapters/scheduling/error-capture');
  const { buildSignedJob } = require('../../adapters/scheduling/build-signed-job');
  const {
    getSchedulerIdempotencyKey,
  } = require('../../adapters/scheduling/get-scheduler-idempotency-key');
  const models = require('../../models');
  const events = require('../../lib/common/events');
  const urlUtils = require('../../../shared/url-utils').default;

  // The constructor subscribes before registering with the adapter. Record the
  // subscriptions so a failed construction can remove them before init rejects.
  const subscriptions: [string, Parameters<PostSchedulingEvents['on']>[1]][] = [];
  const subscriber: PostSchedulingEvents = {
    on(eventName, listener) {
      events.on(eventName, listener);
      subscriptions.push([eventName, listener]);
    },
  };

  try {
    return new PostScheduling({
      apiUrl: urlUtils.urlFor('api', { type: 'admin' }, true),
      adapter: withErrorCapture(adapterManager.getAdapter('scheduling')),
      internalKeys: internalKeys.service,
      models,
      events: subscriber,
      logging,
      buildSignedJob,
      getSchedulerIdempotencyKey,
    });
  } catch (err) {
    for (const [eventName, listener] of subscriptions) {
      events.removeListener(eventName, listener);
    }
    throw err;
  }
});
