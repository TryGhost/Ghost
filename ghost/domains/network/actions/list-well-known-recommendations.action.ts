import type { WellKnownRecommendation } from '../data/well-known-recommendation.data';
import recommendations from '../services/recommendations';

/** The contents of this site's /.well-known/recommendations.json file. */
export function listWellKnownRecommendations(): Promise<WellKnownRecommendation[]> {
  return recommendations.service.service.getWellknownRecommendations();
}
