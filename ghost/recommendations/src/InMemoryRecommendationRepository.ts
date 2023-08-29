import {Recommendation} from "./Recommendation";
import {RecommendationRepository} from "./RecommendationRepository";

export class InMemoryRecommendationRepository implements RecommendationRepository {
    recommendations: Recommendation[] = [];

    async add(recommendation: Recommendation): Promise<Recommendation> {
        this.recommendations.push(recommendation);
        return Promise.resolve(recommendation);
    }

    async edit(id: string, data: Partial<Recommendation>): Promise<Recommendation> {
        const existing = await this.getById(id);
        const updated = {...existing, ...data};
        this.recommendations = this.recommendations.map(r => r.id === id ? updated : r);
        return Promise.resolve(updated);
    }

    async remove(id: string): Promise<void> {
        await this.getById(id);
        this.recommendations = this.recommendations.filter(r => r.id !== id);
    }

    async getById(id: string): Promise<Recommendation> {
        const existing = this.recommendations.find(r => r.id === id);
        if (!existing) {
            throw new Error("Recommendation not found");
        }
        return Promise.resolve(existing);
    }

    async getAll(): Promise<Recommendation[]> {
        return Promise.resolve(this.recommendations);
    }
}
