/** What the application must call in the apps domain. */
import { defineProvider, on } from '#support/define-provider';

export default defineProvider({
  name: 'apps',
  listeners: [
    on('post.published', () => require('./listeners/ping-slack-when-post-published.listener')),
    on('slack.test', () => require('./listeners/send-slack-test-ping.listener')),
  ],
});
