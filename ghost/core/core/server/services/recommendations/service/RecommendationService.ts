import errors from '@tryghost/errors';
import {InMemoryRepository} from '../../lib/InMemoryRepository';
import logging from '@tryghost/logging';
import tpl from '@tryghost/tpl';

import {IncludeOption, OrderOption} from './BookshelfRepository';
import {ClickEvent} from './ClickEvent';
import {AddRecommendation, Recommendation, RecommendationPlain} from './Recommendation';
import {RecommendationRepository} from './RecommendationRepository';
import {SubscribeEvent} from './SubscribeEvent';
import {WellknownService} from './WellknownService';
import {RecommendationMetadataService} from './RecommendationMetadataService';

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
    recommendationMetadataService: RecommendationMetadataService;

    constructor(deps: {
        repository: RecommendationRepository,
        clickEventRepository: InMemoryRepository<string, ClickEvent>,
        subscribeEventRepository: InMemoryRepository<string, SubscribeEvent>,
        wellknownService: WellknownService,
        mentionSendingService: MentionSendingService,
        recommendationEnablerService: RecommendationEnablerService,
        recommendationMetadataService: RecommendationMetadataService
    }) {
        this.repository = deps.repository;
        this.wellknownService = deps.wellknownService;
        this.mentionSendingService = deps.mentionSendingService;
        this.recommendationEnablerService = deps.recommendationEnablerService;
        this.clickEventRepository = deps.clickEventRepository;
        this.subscribeEventRepository = deps.subscribeEventRepository;
        this.recommendationMetadataService = deps.recommendationMetadataService;
    }

    async init() {
        const recommendations = await this.#listRecommendations();
        await this.updateWellknown(recommendations);

        // Do a slow update of all the recommendation metadata (keeping logo up to date, one-click-subscribe, etc.)
        // We better move this to a job in the future
        if (!process.env.NODE_ENV?.startsWith('test')) {
            setTimeout(async () => {
                try {
                    await this.updateAllRecommendationsMetadata();
                } catch (e) {
                    logging.error('[Recommendations] Failed to update all recommendations metadata on boot', e);
                }
            }, 2 * 60 * 1000 + Math.random() * 5 * 60 * 1000);
        }
    }

    async updateAllRecommendationsMetadata() {
        const recommendations = await this.#listRecommendations();
        logging.info('[Recommendations] Updating recommendations metadata');
        for (const recommendation of recommendations) {
            try {
                await this._updateRecommendationMetadata(recommendation);
                await this.repository.save(recommendation);
            } catch (e) {
                logging.error('[Recommendations] Failed to save updated metadata for recommendation ' + recommendation.url.toString(), e);
            }
        }
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

    async checkRecommendation(url: URL): Promise<Partial<RecommendationPlain>> {
        // If a recommendation with this URL already exists, return it, but with updated metadata
        const existing = await this.repository.getByUrl(url);
        if (existing) {
            this._updateRecommendationMetadata(existing);
            await this.repository.save(existing);
            return existing.plain;
        }

        let metadata;
        try {
            metadata = await this.recommendationMetadataService.fetch(url);
        } catch (e) {
            logging.error('[Recommendations] Failed to fetch metadata for url ' + url, e);

            return {
                url: url,
                title: undefined,
                excerpt: undefined,
                featuredImage: undefined,
                favicon: undefined,
                oneClickSubscribe: false
            };
        }

        return {
            url: url,
            title: metadata.title ?? undefined,
            excerpt: metadata.excerpt ?? undefined,
            featuredImage: metadata.featuredImage ?? undefined,
            favicon: metadata.favicon ?? undefined,
            oneClickSubscribe: !!metadata.oneClickSubscribe
        };
    }

    async _updateRecommendationMetadata(recommendation: Recommendation) {
        // Fetch data
        try {
            const metadata = await this.recommendationMetadataService.fetch(recommendation.url);

            // Set null values to undefined so we don't trigger an update
            recommendation.edit({
                // Don't set title if it's already set on the recommendation
                title: recommendation.title ? undefined : (metadata.title ?? undefined),
                excerpt: metadata.excerpt ?? undefined,
                featuredImage: metadata.featuredImage ?? undefined,
                favicon: metadata.favicon ?? undefined,
                oneClickSubscribe: !!metadata.oneClickSubscribe
            });
        } catch (e) {
            logging.error('[Recommendations] Failed to update metadata for recommendation ' + recommendation.url.toString(), e);
        }
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
        await this._updateRecommendationMetadata(existing);
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
