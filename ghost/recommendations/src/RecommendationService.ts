import {BookshelfRepository, OrderOption} from '@tryghost/bookshelf-repository';
import {AddRecommendation, Recommendation} from './Recommendation';
import {RecommendationRepository} from './RecommendationRepository';
import {WellknownService} from './WellknownService';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import {ClickEvent} from './ClickEvent';
import {SubscribeEvent} from './SubscribeEvent';
import {EntityWithIncludes} from './EntityWithIncludes';

export type RecommendationInclude = 'count.clicks'|'count.subscribers';

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
        recommendationEnablerService: RecommendationEnablerService,
    }) {
        this.repository = deps.repository;
        this.wellknownService = deps.wellknownService;
        this.mentionSendingService = deps.mentionSendingService;
        this.recommendationEnablerService = deps.recommendationEnablerService;
        this.clickEventRepository = deps.clickEventRepository;
        this.subscribeEventRepository = deps.subscribeEventRepository;
    }

    async init() {
        const recommendations = (await this.listRecommendations()).map(r => r.entity);
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
        }).catch(console.error); // eslint-disable-line no-console
    }

    async addRecommendation(addRecommendation: AddRecommendation) {
        const recommendation = Recommendation.create(addRecommendation);

        // If a recommendation with this URL already exists, throw an error
        const existing = await this.repository.getByUrl(recommendation.url);
        if (existing) {
            throw new errors.ValidationError({
                message: 'A recommendation with this URL already exists.'
            });
        }

        await this.repository.save(recommendation);

        const recommendations = (await this.listRecommendations()).map(r => r.entity);
        await this.updateWellknown(recommendations);
        await this.updateRecommendationsEnabledSetting(recommendations);

        // Only send an update for the mentioned URL
        this.sendMentionToRecommendation(recommendation);
        return EntityWithIncludes.create<Recommendation, RecommendationInclude>(recommendation);
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

        const recommendations = (await this.listRecommendations()).map(r => r.entity);
        await this.updateWellknown(recommendations);

        this.sendMentionToRecommendation(existing);
        return EntityWithIncludes.create<Recommendation, RecommendationInclude>(existing);
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

        const recommendations = (await this.listRecommendations()).map(r => r.entity);
        await this.updateWellknown(recommendations);
        await this.updateRecommendationsEnabledSetting(recommendations);

        // Send a mention (because it was deleted, according to the webmentions spec)
        this.sendMentionToRecommendation(existing);
    }

    async listRecommendations({page, limit, filter, order, include}: { page: number; limit: number | 'all', filter?: string, order?: OrderOption<Recommendation>, include?: RecommendationInclude[] } = {page: 1, limit: 'all'}): Promise<EntityWithIncludes<Recommendation, RecommendationInclude>[]> {
        let list: Recommendation[];
        if (limit === 'all') {
            list = await this.repository.getAll({filter, order});
        } else {
            list = await this.repository.getPage({page, limit, filter, order});
        }

        // Transform to includes
        const entities = list.map(entity => EntityWithIncludes.create<Recommendation, RecommendationInclude>(entity));
        await this.loadRelations(entities, include);
        return entities;
    }

    async loadRelations(list: EntityWithIncludes<Recommendation, RecommendationInclude>[], include?: RecommendationInclude[]) {
        if (!include || !include.length) {
            return;
        }

        if (list.length === 0) {
            // Avoid doing queries with broken filters
            return;
        }

        for (const relation of include) {
            switch (relation) {
            case 'count.clicks':
                const clickCounts = await this.clickEventRepository.getGroupedCount({groupBy: 'recommendationId', filter: `recommendationId:[${list.map(entity => entity.entity.id).join(',')}]`});

                // Set all to zero by default
                for (const entity of list) {
                    entity.setInclude(relation, 0);
                }

                for (const r of clickCounts) {
                    const entity = list.find(e => e.entity.id === r.recommendationId);
                    if (entity) {
                        entity.setInclude(relation, r.count);
                    }
                }

                break;

            case 'count.subscribers':
                const subscribersCounts = await this.subscribeEventRepository.getGroupedCount({groupBy: 'recommendationId', filter: `recommendationId:[${list.map(entity => entity.entity.id).join(',')}]`});

                // Set all to zero by default
                for (const entity of list) {
                    entity.setInclude(relation, 0);
                }

                for (const r of subscribersCounts) {
                    const entity = list.find(e => e.entity.id === r.recommendationId);
                    if (entity) {
                        entity.setInclude(relation, r.count);
                    }
                }

                break;
            default:
                // Should create a Type compile error in case we didn't catch all relations
                const r: never = relation;
                console.error(`Unknown relation ${r}`); // eslint-disable-line no-console
            }
        }
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
