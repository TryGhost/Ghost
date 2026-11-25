/** Everything the apps domain plugs into Ghost. */
import { defineProvider } from '#support/define-provider';
import { EditIntegration } from './actions/edit-integration.action';
import pingSlackWhenPostPublished from './listeners/ping-slack-when-post-published.listener';
import sendSlackTestPing from './listeners/send-slack-test-ping.listener';
import { SlackPing } from './services/slack-ping.service';

export default defineProvider({
  name: 'apps',
  actions: [EditIntegration],
  listeners: [pingSlackWhenPostPublished, sendSlackTestPing],
  services: [SlackPing],
});
