import { listen } from '#support/define-provider';
import { LegacyEvents } from '../../../shared/transition/legacy';
import { SlackPing } from '../services/slack-ping';

// The Admin API's "send test notification" emits slack.test, to avoid a circular dependency.
export default listen({
  bus: LegacyEvents,
  event: 'slack.test',
  service: SlackPing,
  handle: (slackPing) => slackPing.handleTestEvent(),
});
