import type { Site } from '#support/site';
import { isRecommendationUrl } from '../entities/recommendation-url.value';
import type MentionCreatedEvent from '../events/mention-created.event';
import { incomingRecommendations } from '../services/incoming-recommendation.service';

type Mention = Parameters<ReturnType<typeof incomingRecommendations>['sendRecommendationEmail']>[0];

// Another site recommends this one by sending a webmention from its recommendations file.
export default async function sendRecommendationEmailWhenMentionCreated(
  site: Site,
  event: MentionCreatedEvent,
) {
  const { mention } = event.data;
  if (mention.verified && isRecommendationUrl(mention.source)) {
    site.log.info('[INCOMING RECOMMENDATION] Received recommendation from ' + mention.source);
    await incomingRecommendations(site).sendRecommendationEmail(mention as unknown as Mention);
  }
}
