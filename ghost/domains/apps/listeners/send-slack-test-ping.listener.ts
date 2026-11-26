import type { Site } from '#support/site';
import { slackPing } from '../services/slack-ping.service';

// The Admin API's "send test notification" emits slack.test to verify the webhook
// configuration. It is an event, not a call, to avoid a circular dependency.
export default function sendSlackTestPing(site: Site) {
  return slackPing(site).ping({
    message: 'Heya! This is a test notification from your Ghost blog :smile:. Seems to work fine!',
  });
}
