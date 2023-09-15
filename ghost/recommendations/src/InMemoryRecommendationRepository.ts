import {Recommendation} from './Recommendation';
import {RecommendationRepository} from './RecommendationRepository';
import {InMemoryRepository} from '@tryghost/in-memory-repository';

export class InMemoryRecommendationRepository extends InMemoryRepository<string, Recommendation> implements RecommendationRepository {
    toPrimitive(entity: Recommendation): object {
        return entity;
    }

    getByUrl(url: URL): Promise<Recommendation | null> {
        return this.getAll().then((recommendations) => {
            return recommendations.find(recommendation => recommendation.url.toString() === url.toString()) || null;
        });
    }
}
