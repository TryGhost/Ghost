import { defineListener } from '#support/define-listener';
import { LegacyEvents } from '../../../shared/transition/legacy';
import { SlackPing } from '../services/slack-ping.service';

// The Admin API's "send test notification" emits slack.test to verify the webhook
// configuration. It is an event, not a call, to avoid a circular dependency.
export default defineListener({
  bus: LegacyEvents,
  event: 'slack.test',
  needs: { slackPing: SlackPing },
  handle: ({ slackPing }) => {
    slackPing.ping({
      message:
        'Heya! This is a test notification from your Ghost blog :smile:. Seems to work fine!',
    });
  },
});
