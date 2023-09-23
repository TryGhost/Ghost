import {OrderOption} from '@tryghost/bookshelf-repository';
import {Recommendation} from './Recommendation';

export interface RecommendationRepository {
    save(entity: Recommendation): Promise<void>;
    getById(id: string): Promise<Recommendation | null>;
    getByUrl(url: URL): Promise<Recommendation[]>;
    getAll({filter, order}?: {filter?: string, order?: OrderOption<Recommendation>}): Promise<Recommendation[]>;
    getPage({filter, order, page, limit}: {
        filter?: string;
        order?: OrderOption<Recommendation>;
        page: number;
        limit: number;
    }): Promise<Recommendation[]>;
    getCount({filter}?: {
        filter?: string;
    }): Promise<number>;
};
