import type { Site } from '#support/site';
import { recommendationEnabler } from '../services/recommendation-enabler.service';
import { recommendations } from '../services/recommendation.service';

// Keeps each recommended site's title, logo and one-click subscribe up to date.
export default async function refreshRecommendationMetadata(site: Site) {
  if (site.config.get('services:recommendations:enabled') === false) {
    return;
  }
  if (recommendationEnabler(site).getSetting() !== 'true') {
    return;
  }
  await recommendations(site).updateAllRecommendationsMetadata();
}
