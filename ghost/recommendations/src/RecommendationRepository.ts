import {Recommendation} from "./Recommendation";

export interface RecommendationRepository {
    save(entity: Recommendation): Promise<void>;
    getById(id: string): Promise<Recommendation | null>;
    getAll(): Promise<Recommendation[]>;
};
