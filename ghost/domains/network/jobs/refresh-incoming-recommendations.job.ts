import type { Site } from '#support/site';
import { incomingRecommendations } from '../services/incoming-recommendation.service';

// A webmention can be missed, and so can the removal of one. This checks every
// incoming recommendation again, including those that failed or were deleted.
export default async function refreshIncomingRecommendations(site: Site) {
  if (site.config.get('services:recommendations:enabled') === false) {
    return;
  }
  await incomingRecommendations(site).refreshAll();
}
