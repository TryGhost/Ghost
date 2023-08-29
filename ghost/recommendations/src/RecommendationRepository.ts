import {Recommendation} from "./Recommendation";

export interface RecommendationRepository {
    add(recommendation: Recommendation): Promise<Recommendation>
    edit(id: string, data: Partial<Recommendation>): Promise<Recommendation>
    remove(id: string): Promise<void>
    getById(id: string): Promise<Recommendation>
    getAll(): Promise<Recommendation[]>
};
