import {Recommendation} from "./Recommendation";
import {RecommendationRepository} from "./RecommendationRepository";
import {WellknownService} from "./WellknownService";

type MentionSendingService = {
    sendAll(options: {url: URL, links: URL[]}): Promise<void>
}

export class RecommendationService {
    repository: RecommendationRepository;
    wellknownService: WellknownService;
    mentionSendingService: MentionSendingService;

    constructor(deps: {repository: RecommendationRepository, wellknownService: WellknownService, mentionSendingService: MentionSendingService}) {
        this.repository = deps.repository;
        this.wellknownService = deps.wellknownService;
        this.mentionSendingService = deps.mentionSendingService;
    }

    async init() {
        await this.updateWellknown();
    }

    async updateWellknown() {
        const recommendations = await this.listRecommendations();
        await this.wellknownService.set(recommendations);
    }

    sendMentionToRecommendation(recommendation: Recommendation) {
         this.mentionSendingService.sendAll({
            url: this.wellknownService.getURL(),
            links: [
                recommendation.url
            ]
        }).catch(console.error);
    }

    async addRecommendation(recommendation: Recommendation) {
        const r = this.repository.add(recommendation);
        await this.updateWellknown();

        // Only send an update for the mentioned URL
        this.sendMentionToRecommendation(recommendation);
        return r;
    }

    async editRecommendation(id: string, recommendationEdit: Partial<Recommendation>) {
        // Check if it exists
        const existing = await this.repository.getById(id);
        const e = await this.repository.edit(existing.id, recommendationEdit);

        await this.updateWellknown();
        this.sendMentionToRecommendation(e);
        return e;
    }

    async deleteRecommendation(id: string) {
        const existing = await this.repository.getById(id);
        await this.repository.remove(existing.id);
        await this.updateWellknown();

        // Send a mention (because it was deleted, according to the webmentions spec)
        this.sendMentionToRecommendation(existing);
    }

    async listRecommendations() {
        return await this.repository.getAll()
    }
}
