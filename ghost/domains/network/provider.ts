/** What the application must call in the network domain. */
import { defineProvider, on } from '#support/define-provider';
import { dailyOffPeak } from '#support/schedule';
import MentionCreatedEvent from './events/mention-created.event';

export default defineProvider({
  name: 'network',
  listeners: [
    on(MentionCreatedEvent, () =>
      require('./listeners/send-recommendation-email-when-mention-created.listener'),
    ),
  ],
  jobs: {
    'refresh-recommendation-metadata': {
      cron: dailyOffPeak(),
      handle: () => require('./jobs/refresh-recommendation-metadata.job'),
    },
    'refresh-incoming-recommendations': {
      cron: dailyOffPeak(),
      handle: () => require('./jobs/refresh-incoming-recommendations.job'),
    },
  },
});
