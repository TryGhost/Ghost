import {BookshelfRepository, ModelClass, ModelInstance} from './bookshelf-repository';
import logger from '@tryghost/logging';
import {SubscribeEvent} from './subscribe-event';

type Sentry = {
    captureException(err: unknown): void;
}

export class BookshelfSubscribeEventRepository extends BookshelfRepository<string, SubscribeEvent> {
    sentry?: Sentry;

    constructor(Model: ModelClass<string>, deps: {sentry?: Sentry} = {}) {
        super(Model);
        this.sentry = deps.sentry;
    }

    toPrimitive(entity: SubscribeEvent): object {
        return {
            id: entity.id,
            recommendation_id: entity.recommendationId,
            member_id: entity.memberId,
            created_at: entity.createdAt
        };
    }

    modelToEntity(model: ModelInstance<string>): SubscribeEvent | null {
        try {
            return SubscribeEvent.create({
                id: model.id,
                recommendationId: model.get('recommendation_id') as string,
                memberId: model.get('member_id') as string,
                createdAt: model.get('created_at') as Date
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
            recommendationId: 'recommendation_id',
            memberId: 'member_id',
            createdAt: 'created_at'
        } as Record<keyof SubscribeEvent, string>;
    }
}
