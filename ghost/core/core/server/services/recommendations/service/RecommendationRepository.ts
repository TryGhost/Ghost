import {AllOptions} from './BookshelfRepository';
import {Recommendation} from './Recommendation';

export interface RecommendationRepository {
    save(entity: Recommendation): Promise<void>;
    getById(id: string): Promise<Recommendation | null>;
    getByUrl(url: URL): Promise<Recommendation|null>;
    getAll(options: Omit<AllOptions<Recommendation>, 'page'|'limit'>): Promise<Recommendation[]>;
    getPage(options: AllOptions<Recommendation> & Required<Pick<AllOptions<Recommendation>, 'page'|'limit'>>): Promise<Recommendation[]>;
    getCount(options: {
        filter?: string;
    }): Promise<number>;
}