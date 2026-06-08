import {Recommendation} from './recommendation';
import {RecommendationRepository} from './recommendation-repository';
import {InMemoryRepository} from '../../lib/in-memory-repository';

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
