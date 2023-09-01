import {Recommendation} from "./Recommendation";
import {RecommendationRepository} from "./RecommendationRepository";
import {WellknownService} from "./WellknownService";
import errors from "@tryghost/errors";
import tpl from "@tryghost/tpl";

type MentionSendingService = {
    sendAll(options: {url: URL, links: URL[]}): Promise<void>
}

const messages = {
    notFound: "Recommendation with id {id} not found"
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
        this.repository.save(recommendation);
        await this.updateWellknown();

        // Only send an update for the mentioned URL
        this.sendMentionToRecommendation(recommendation);
        return recommendation;
    }

    async editRecommendation(id: string, recommendationEdit: Partial<Recommendation>) {
        // Check if it exists
        const existing = await this.repository.getById(id);
        if (!existing) {
            throw new errors.NotFoundError({
                message: tpl(messages.notFound, {id})
            });
        }

        existing.edit(recommendationEdit);
        await this.repository.save(existing);

        await this.updateWellknown();
        this.sendMentionToRecommendation(existing);
        return existing;
    }

    async deleteRecommendation(id: string) {
        const existing = await this.repository.getById(id);
        if (!existing) {
            throw new errors.NotFoundError({
                message: tpl(messages.notFound, {id})
            });
        }

        existing.delete();
        await this.repository.save(existing);
        await this.updateWellknown();

        // Send a mention (because it was deleted, according to the webmentions spec)
        this.sendMentionToRecommendation(existing);
    }

    async listRecommendations() {
        return await this.repository.getAll()
    }
}
