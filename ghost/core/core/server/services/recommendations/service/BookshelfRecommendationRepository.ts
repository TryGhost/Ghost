import {AllOptions, BookshelfRepository, ModelClass, ModelInstance} from './BookshelfRepository';
import logger from '@tryghost/logging';
import {Knex} from 'knex';
import {Recommendation} from './Recommendation';
import {RecommendationRepository} from './RecommendationRepository';

type Sentry = {
    captureException(err: unknown): void;
}

type RecommendationFindOneData<T> = {
    id?: T;
    url?: string;
};

type RecommendationModelClass<T> = ModelClass<T> & {
    findOne: (data: RecommendationFindOneData<T>, options?: { require?: boolean }) => Promise<ModelInstance<T> | null>;
};

export class BookshelfRecommendationRepository extends BookshelfRepository<string, Recommendation> implements RecommendationRepository {
    sentry?: Sentry;

    constructor(Model: RecommendationModelClass<string>, deps: {sentry?: Sentry} = {}) {
        super(Model);
        this.sentry = deps.sentry;
    }

    applyCustomQuery(query: Knex.QueryBuilder, options: AllOptions<Recommendation>) {
        query.select('recommendations.*');

        if (options.include?.includes('clickCount') || options.order?.find(o => o.field === 'clickCount')) {
            query.select((knex: Knex.QueryBuilder) => {
                knex.count('*').from('recommendation_click_events').where('recommendation_click_events.recommendation_id', knex.client.raw('recommendations.id')).as('count__clicks');
            });
        }

        if (options.include?.includes('subscriberCount') || options.order?.find(o => o.field === 'subscriberCount')) {
            query.select((knex: Knex.QueryBuilder) => {
                knex.count('*').from('recommendation_subscribe_events').where('recommendation_subscribe_events.recommendation_id', knex.client.raw('recommendations.id')).as('count__subscribers');
            });
        }
    }

    toPrimitive(entity: Recommendation): object {
        return {
            id: entity.id,
            title: entity.title,
            description: entity.description,
            excerpt: entity.excerpt,
            featured_image: entity.featuredImage?.toString(),
            favicon: entity.favicon?.toString(),
            url: entity.url.toString(),
            one_click_subscribe: entity.oneClickSubscribe,
            created_at: entity.createdAt,
            updated_at: entity.updatedAt
            // Count relations are not saveable: so don't set them here
        };
    }

    modelToEntity(model: ModelInstance<string>): Recommendation | null {
        try {
            return Recommendation.create({
                id: model.id,
                title: model.get('title') as string,
                description: model.get('description') as string | null,
                excerpt: model.get('excerpt') as string | null,
                featuredImage: model.get('featured_image') as string | null,
                favicon: model.get('favicon') as string | null,
                url: model.get('url') as string,
                oneClickSubscribe: model.get('one_click_subscribe') as boolean,
                createdAt: model.get('created_at') as Date,
                updatedAt: model.get('updated_at') as Date | null,
                clickCount: (model.get('count__clicks') ?? undefined) as number | undefined,
                subscriberCount: (model.get('count__subscribers') ?? undefined) as number | undefined
            });
        } catch (err) {
            logger.error(err);
            this.sentry?.captureException(err);
            return null;
        }
    }

    getFieldToColumnMap() {
        return {
            id: 'id',
            title: 'title',
            description: 'description',
            excerpt: 'excerpt',
            featuredImage: 'featured_image',
            favicon: 'favicon',
            url: 'url',
            oneClickSubscribe: 'one_click_subscribe',
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            clickCount: 'count__clicks',
            subscriberCount: 'count__subscribers'
        } as Record<keyof Recommendation, string>;
    }

    async getByUrl(url: URL): Promise<Recommendation | null> {
        const urlFilter = `url:~'${url.host.replace('www.', '')}${url.pathname.replace(/\/$/, '')}'`;
        const recommendations = await this.getAll({filter: urlFilter});

        if (!recommendations || recommendations.length === 0) {
            return null;
        }

        //  Find URL based on the hostname and pathname.
        //  Query params, hash fragements, protocol and www are ignored.
        const existing = recommendations.find((r) => {
            return r.url.hostname.replace('www.', '') === url.hostname.replace('www.', '') &&
                   r.url.pathname.replace(/\/$/, '') === url.pathname.replace(/\/$/, '');
        }) || null;

        return existing;
    }
}
