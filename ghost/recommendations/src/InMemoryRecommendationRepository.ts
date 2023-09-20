import {Recommendation} from './Recommendation';
import {RecommendationRepository} from './RecommendationRepository';
import {InMemoryRepository} from '@tryghost/in-memory-repository';

export class InMemoryRecommendationRepository extends InMemoryRepository<string, Recommendation> implements RecommendationRepository {
    toPrimitive(entity: Recommendation): object {
        return entity;
    }

    getByUrl(url: URL): Promise<Recommendation[]> {
        const urlFilter = `url:~'${url.host.replace('www.', '')}${url.pathname.replace(/\/$/, '')}'`;
        return this.getPage({filter: urlFilter, page: 1, limit: 1});
    }
}
