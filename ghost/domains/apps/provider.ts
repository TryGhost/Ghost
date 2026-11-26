/** What the application must call in the apps domain. */
import { defineProvider } from '#support/define-provider';

export default defineProvider({
  name: 'apps',
  listeners: {
    'post.published': () => require('./listeners/ping-slack-when-post-published.listener'),
    'slack.test': () => require('./listeners/send-slack-test-ping.listener'),
  },
});
