import { defineJob } from '../../../core/kernel/domains/definitions';
import recommendations from '../services/recommendations';

// Re-checks every site that recommends this one, to catch recommendations made
// or withdrawn while Ghost was down. Waiting at least fifteen seconds keeps
// quick restarts from each fetching other sites.
export default defineJob({
  schedule: { once: 'boot', delay: () => 15 * 1000 + Math.random() * 5 * 60 * 1000 },
  run: () => recommendations.service.refreshIncomingRecommendations(),
});
