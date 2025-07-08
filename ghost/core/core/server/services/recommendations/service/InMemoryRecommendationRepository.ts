import {Recommendation} from './Recommendation';
import {RecommendationRepository} from './RecommendationRepository';
import {InMemoryRepository} from '../../lib/InMemoryRepository';

export class InMemoryRecommendationRepository extends InMemoryRepository<string, Recommendation> implements RecommendationRepository {
    toPrimitive(entity: Recommendation): object {
        return entity;
    }

    async getByUrl(url: URL): Promise<Recommendation | null > {
        //  Find URL based on the hostname and pathname.
        //  Query params, hash fragements, protocol and www are ignored.
        const existing = this.store.find((r) => {
            return r.url.hostname.replace('www.', '') === url.hostname.replace('www.', '') &&
                   r.url.pathname.replace(/\/$/, '') === url.pathname.replace(/\/$/, '');
        }) || null;

        return existing;
    }
}
