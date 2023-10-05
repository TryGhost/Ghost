import {IncludeOption, OrderOption} from '@tryghost/bookshelf-repository';
import errors from '@tryghost/errors';
import {InMemoryRepository} from '@tryghost/in-memory-repository';
import logging from '@tryghost/logging';
import tpl from '@tryghost/tpl';
import {ClickEvent} from './ClickEvent';
import {AddRecommendation, Recommendation, RecommendationPlain} from './Recommendation';
import {RecommendationRepository} from './RecommendationRepository';
import {SubscribeEvent} from './SubscribeEvent';
import {WellknownService} from './WellknownService';

type MentionSendingService = {
    sendAll(options: {url: URL, links: URL[]}): Promise<void>
}

type RecommendationEnablerService = {
    getSetting(): string,
    setSetting(value: string): Promise<void>
}

const messages = {
    notFound: 'Recommendation with id {id} not found'
};

export class RecommendationService {
    repository: RecommendationRepository;
    clickEventRepository: InMemoryRepository<string, ClickEvent>;
    subscribeEventRepository: InMemoryRepository<string, SubscribeEvent>;

    wellknownService: WellknownService;
    mentionSendingService: MentionSendingService;
    recommendationEnablerService: RecommendationEnablerService;

    constructor(deps: {
        repository: RecommendationRepository,
        clickEventRepository: InMemoryRepository<string, ClickEvent>,
        subscribeEventRepository: InMemoryRepository<string, SubscribeEvent>,
        wellknownService: WellknownService,
        mentionSendingService: MentionSendingService,
        recommendationEnablerService: RecommendationEnablerService
    }) {
        this.repository = deps.repository;
        this.wellknownService = deps.wellknownService;
        this.mentionSendingService = deps.mentionSendingService;
        this.recommendationEnablerService = deps.recommendationEnablerService;
        this.clickEventRepository = deps.clickEventRepository;
        this.subscribeEventRepository = deps.subscribeEventRepository;
    }

    async init() {
        const recommendations = await this.#listRecommendations();
        await this.updateWellknown(recommendations);
    }

    async updateWellknown(recommendations: Recommendation[]) {
        await this.wellknownService.set(recommendations);
    }

    async updateRecommendationsEnabledSetting(recommendations: Recommendation[]) {
        const expectedSetting = (recommendations.length > 0).toString();
        const currentSetting = this.recommendationEnablerService.getSetting();

        if (currentSetting && currentSetting === expectedSetting) {
            return;
        }

        await this.recommendationEnablerService.setSetting(expectedSetting);
    }

    private sendMentionToRecommendation(recommendation: Recommendation) {
        this.mentionSendingService.sendAll({
            url: this.wellknownService.getURL(),
            links: [
                recommendation.url
            ]
        }).catch((err) => {
            logging.error('Failed to send mention to recommendation', err);
        });
    }

    async readRecommendation(id: string): Promise<RecommendationPlain> {
        const recommendation = await this.repository.getById(id);

        if (!recommendation) {
            throw new errors.NotFoundError({
                message: tpl(messages.notFound, {id})
            });
        }

        return recommendation.plain;
    }

    async addRecommendation(addRecommendation: AddRecommendation): Promise<RecommendationPlain> {
        const recommendation = Recommendation.create(addRecommendation);

        // If a recommendation with this URL already exists, throw an error
        const existing = await this.repository.getByUrl(recommendation.url);
        if (existing) {
            throw new errors.ValidationError({
                message: 'A recommendation with this URL already exists.'
            });
        }

        await this.repository.save(recommendation);

        const recommendations = await this.#listRecommendations();
        await this.updateWellknown(recommendations);
        await this.updateRecommendationsEnabledSetting(recommendations);

        // Only send an update for the mentioned URL
        this.sendMentionToRecommendation(recommendation);
        return recommendation.plain;
    }

    async editRecommendation(id: string, recommendationEdit: Partial<Recommendation>): Promise<RecommendationPlain> {
        // Check if it exists
        const existing = await this.repository.getById(id);
        if (!existing) {
            throw new errors.NotFoundError({
                message: tpl(messages.notFound, {id})
            });
        }

        existing.edit(recommendationEdit);
        await this.repository.save(existing);

        const recommendations = await this.#listRecommendations();
        await this.updateWellknown(recommendations);

        this.sendMentionToRecommendation(existing);
        return existing.plain;
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

        const recommendations = await this.#listRecommendations();
        await this.updateWellknown(recommendations);
        await this.updateRecommendationsEnabledSetting(recommendations);

        // Send a mention (because it was deleted, according to the webmentions spec)
        this.sendMentionToRecommendation(existing);
    }

    /**
     * Sames as listRecommendations, but returns Entities instead of plain objects (Entities are only used internally)
     */
    async #listRecommendations(options: { filter?: string; order?: OrderOption<Recommendation>; page?: number; limit?: number|'all', include?: IncludeOption<Recommendation> } = {page: 1, limit: 'all'}): Promise<Recommendation[]> {
        if (options.limit === 'all') {
            return await this.repository.getAll({
                ...options
            });
        }
        return await this.repository.getPage({
            ...options,
            page: options.page || 1,
            limit: options.limit || 15
        });
    }

    async listRecommendations(options: { filter?: string; order?: OrderOption<Recommendation>; page?: number; limit?: number|'all', include?: IncludeOption<Recommendation> } = {page: 1, limit: 'all', include: []}): Promise<RecommendationPlain[]> {
        const list = await this.#listRecommendations(options);
        return list.map(e => e.plain);
    }

    async countRecommendations({filter}: { filter?: string }) {
        return await this.repository.getCount({filter});
    }

    async trackClicked({id, memberId}: { id: string, memberId?: string }) {
        const clickEvent = ClickEvent.create({recommendationId: id, memberId});
        await this.clickEventRepository.save(clickEvent);
    }

    async trackSubscribed({id, memberId}: { id: string, memberId: string }) {
        const subscribeEvent = SubscribeEvent.create({recommendationId: id, memberId});
        await this.subscribeEventRepository.save(subscribeEvent);
    }

    async readRecommendationByUrl(url: URL): Promise<RecommendationPlain|null> {
        const recommendation = await this.repository.getByUrl(url);

        if (!recommendation) {
            return null;
        }
        return recommendation.plain;
    }
}
