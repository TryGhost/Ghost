import { listen } from '#support/define-provider';
import { LegacyEvents } from '../../../shared/transition/legacy';
import { SlackPing } from '../services/slack-ping';

export default listen({
  bus: LegacyEvents,
  event: 'post.published',
  service: SlackPing,
  handle: (slackPing, model, options) => slackPing.handlePostEvent(model, options),
});
