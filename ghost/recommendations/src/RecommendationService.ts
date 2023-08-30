import {Recommendation} from "./Recommendation";
import {RecommendationRepository} from "./RecommendationRepository";

export class RecommendationService {
    repository: RecommendationRepository;

    constructor(deps: {repository: RecommendationRepository}) {
        this.repository = deps.repository;
    }

    async addRecommendation(recommendation: Recommendation) {
        return this.repository.add(recommendation);
    }

    async editRecommendation(id: string, recommendationEdit: Partial<Recommendation>) {
        // Check if it exists
        const existing = await this.repository.getById(id);
        return this.repository.edit(existing.id, recommendationEdit);
    }

    async deleteRecommendation(id: string) {
        const existing = await this.repository.getById(id);
        await this.repository.remove(existing.id);
    }

    async listRecommendations() {
        return await this.repository.getAll()
    }
}
