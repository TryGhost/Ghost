import {AddRecommendation, Recommendation} from "./Recommendation";
import {RecommendationRepository} from "./RecommendationRepository";
import {WellknownService} from "./WellknownService";
import errors from "@tryghost/errors";
import tpl from "@tryghost/tpl";

type MentionSendingService = {
    sendAll(options: {url: URL, links: URL[]}): Promise<void>
}

type SettingsService = {
    read(key: string): string,
    edit(settings: object[], options: { context?: object; }): Promise<void>
}

const messages = {
    notFound: "Recommendation with id {id} not found"
}

export class RecommendationService {
    repository: RecommendationRepository;
    wellknownService: WellknownService;
    mentionSendingService: MentionSendingService;
    settingsService: SettingsService;

    constructor(deps: {
        repository: RecommendationRepository,
        wellknownService: WellknownService,
        mentionSendingService: MentionSendingService,
        settingsService: SettingsService,
    }) {
        this.repository = deps.repository;
        this.wellknownService = deps.wellknownService;
        this.mentionSendingService = deps.mentionSendingService;
        this.settingsService = deps.settingsService;
    }

    async init() {
        const recommendations = await this.listRecommendations();
        await this.updateWellknown(recommendations);
    }

    async updateWellknown(recommendations: Recommendation[]) {
        await this.wellknownService.set(recommendations);
    }

    async updateRecommendationsEnabledSetting(recommendations: Recommendation[]) {
        const expectedSetting = (recommendations.length > 0).toString();
        const currentSetting = this.settingsService.read('recommendations_enabled');

        if (currentSetting && currentSetting === expectedSetting) {
            return;
        }

        await this.settingsService.edit([{key: 'recommendations_enabled', value: expectedSetting}], {context: {}});
    }

    private sendMentionToRecommendation(recommendation: Recommendation) {
         this.mentionSendingService.sendAll({
            url: this.wellknownService.getURL(),
            links: [
                recommendation.url
            ]
        }).catch(console.error);
    }

    async addRecommendation(addRecommendation: AddRecommendation) {
        const recommendation = Recommendation.create(addRecommendation);
        await this.repository.save(recommendation);

        const recommendations = await this.listRecommendations();
        await this.updateWellknown(recommendations);
        await this.updateRecommendationsEnabledSetting(recommendations);

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

        const recommendations = await this.listRecommendations();
        await this.updateWellknown(recommendations);

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

        const recommendations = await this.listRecommendations();
        await this.updateWellknown(recommendations);
        await this.updateRecommendationsEnabledSetting(recommendations);

        // Send a mention (because it was deleted, according to the webmentions spec)
        this.sendMentionToRecommendation(existing);
    }

    async listRecommendations() {
        return await this.repository.getAll()
    }
}
