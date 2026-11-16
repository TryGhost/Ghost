import { defineJob } from '../../../core/kernel/domains/definitions';
import recommendations from '../services/recommendations';

// Keeps each recommendation's logo, title and one-click-subscribe support up to
// date. It fetches other sites, so it waits two to seven minutes after Ghost
// has started rather than competing with boot.
export default defineJob({
  schedule: { once: 'boot', delay: () => 2 * 60 * 1000 + Math.random() * 5 * 60 * 1000 },
  run: () => recommendations.service.refreshRecommendationMetadata(),
});
