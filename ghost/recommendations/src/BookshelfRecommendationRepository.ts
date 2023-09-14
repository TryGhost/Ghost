import {Recommendation} from './Recommendation';
import {RecommendationRepository} from './RecommendationRepository';
import {BookshelfRepository, ModelClass, ModelInstance} from '@tryghost/bookshelf-repository';
import logger from '@tryghost/logging';

type Sentry = {
    captureException(err: unknown): void;
}

export class BookshelfRecommendationRepository extends BookshelfRepository<string, Recommendation> implements RecommendationRepository {
    sentry?: Sentry;

    constructor(Model: ModelClass<string>, deps: {sentry?: Sentry} = {}) {
        super(Model);
        this.sentry = deps.sentry;
    }

    toPrimitive(entity: Recommendation): object {
        return {
            id: entity.id,
            title: entity.title,
            reason: entity.reason,
            excerpt: entity.excerpt,
            featured_image: entity.featuredImage?.toString(),
            favicon: entity.favicon?.toString(),
            url: entity.url.toString(),
            one_click_subscribe: entity.oneClickSubscribe,
            created_at: entity.createdAt,
            updated_at: entity.updatedAt
        };
    }

    modelToEntity(model: ModelInstance<string>): Recommendation | null {
        try {
            return Recommendation.create({
                id: model.id,
                title: model.get('title') as string,
                reason: model.get('reason') as string | null,
                excerpt: model.get('excerpt') as string | null,
                featuredImage: (model.get('featured_image') as string | null) !== null ? new URL(model.get('featured_image') as string) : null,
                favicon: (model.get('favicon') as string | null) !== null ? new URL(model.get('favicon') as string) : null,
                url: new URL(model.get('url') as string),
                oneClickSubscribe: model.get('one_click_subscribe') as boolean,
                createdAt: model.get('created_at') as Date,
                updatedAt: model.get('updated_at') as Date | null
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
            reason: 'reason',
            excerpt: 'excerpt',
            featuredImage: 'featured_image',
            favicon: 'favicon',
            url: 'url',
            oneClickSubscribe: 'one_click_subscribe',
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        } as Record<keyof Recommendation, string>;
    }
}
