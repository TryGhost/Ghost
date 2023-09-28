import {BookshelfRepository, OrderOption} from '@tryghost/bookshelf-repository';
import {AddRecommendation, Recommendation, RecommendationPlain} from './Recommendation';
import {RecommendationRepository} from './RecommendationRepository';
import {WellknownService} from './WellknownService';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import {ClickEvent} from './ClickEvent';
import {SubscribeEvent} from './SubscribeEvent';
import logging from '@tryghost/logging';

export type RecommendationIncludeTypes = {
    'count.clicks': number,
    'count.subscribers': number
};
export type RecommendationIncludeFields = keyof RecommendationIncludeTypes;

/**
 * All includes are optional, but if they are explicitly loaded, they will not be optional in the result.
 *
 * E.g. RecommendationWithIncludes['count.clicks'|'count.subscribers'].
 *
 * When using methods like listRecommendations with the include option, the result will automatically return the correct relations
 */
export type RecommendationWithIncludes<IncludeFields extends RecommendationIncludeFields = never> = RecommendationPlain & Partial<RecommendationIncludeTypes> & Record<IncludeFields, RecommendationIncludeTypes[IncludeFields]>;

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
    clickEventRepository: BookshelfRepository<string, ClickEvent>;
    subscribeEventRepository: BookshelfRepository<string, SubscribeEvent>;

    wellknownService: WellknownService;
    mentionSendingService: MentionSendingService;
    recommendationEnablerService: RecommendationEnablerService;

    constructor(deps: {
        repository: RecommendationRepository,
        clickEventRepository: BookshelfRepository<string, ClickEvent>,
        subscribeEventRepository: BookshelfRepository<string, SubscribeEvent>,
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
        if (existing && existing.length > 0) {
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

    async #listRecommendations({page, limit, filter, order}: { page: number; limit: number | 'all', filter?: string, order?: OrderOption<Recommendation>} = {page: 1, limit: 'all'}): Promise<Recommendation[]> {
        let list: Recommendation[];
        if (limit === 'all') {
            list = await this.repository.getAll({filter, order});
        } else {
            if (page < 1) {
                throw new errors.BadRequestError({message: 'page must be greater or equal to 1'});
            }
            if (limit < 1) {
                throw new errors.BadRequestError({message: 'limit must be greater or equal to 1'});
            }
            list = await this.repository.getPage({page, limit, filter, order});
        }
        return list;
    }

    /**
     * Same as #listRecommendations, but with includes and returns a plain object for external use
     */
    async listRecommendations<IncludeFields extends RecommendationIncludeFields = never>({page, limit, filter, order, include}: { page: number; limit: number | 'all', filter?: string, order?: OrderOption<Recommendation>, include?: IncludeFields[] } = {page: 1, limit: 'all', include: []}): Promise<RecommendationWithIncludes<IncludeFields>[]> {
        const list = await this.#listRecommendations({page, limit, filter, order});
        return await this.loadRelations(list, include);
    }

    async loadRelations<IncludeFields extends RecommendationIncludeFields>(list: Recommendation[], include?: IncludeFields[]): Promise<RecommendationWithIncludes<IncludeFields>[]> {
        const plainList: RecommendationWithIncludes[] = list.map(e => e.plain);

        if (!include || !include.length) {
            return plainList as RecommendationWithIncludes<IncludeFields>[];
        }

        if (list.length === 0) {
            // Avoid doing queries with broken filters
            return plainList as RecommendationWithIncludes<IncludeFields>[];
        }

        for (const relation of include) {
            switch (relation) {
            case 'count.clicks':
                const clickCounts = await this.clickEventRepository.getGroupedCount({groupBy: 'recommendationId', filter: `recommendationId:[${list.map(entity => entity.id).join(',')}]`});

                // Set all to zero by default
                for (const entity of plainList) {
                    entity[relation] = 0;
                }

                for (const r of clickCounts) {
                    const entity = plainList.find(e => e.id === r.recommendationId);
                    if (entity) {
                        entity[relation] = r.count;
                    }
                }

                break;

            case 'count.subscribers':
                const subscribersCounts = await this.subscribeEventRepository.getGroupedCount({groupBy: 'recommendationId', filter: `recommendationId:[${list.map(entity => entity.id).join(',')}]`});

                // Set all to zero by default
                for (const entity of plainList) {
                    entity[relation] = 0;
                }

                for (const r of subscribersCounts) {
                    const entity = plainList.find(e => e.id === r.recommendationId);
                    if (entity) {
                        entity[relation] = r.count;
                    }
                }

                break;
            default:
                // Should create a Type compile error in case we didn't catch all relations
                const r: never = relation;
                console.error(`Unknown relation ${r}`); // eslint-disable-line no-console
            }
        }

        return plainList as RecommendationWithIncludes<IncludeFields>[];
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
}
