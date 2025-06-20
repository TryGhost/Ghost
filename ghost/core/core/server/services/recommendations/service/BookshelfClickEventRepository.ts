import {BookshelfRepository, ModelClass, ModelInstance} from './BookshelfRepository';
import logger from '@tryghost/logging';
import {ClickEvent} from './ClickEvent';

type Sentry = {
    captureException(err: unknown): void;
}

export class BookshelfClickEventRepository extends BookshelfRepository<string, ClickEvent> {
    sentry?: Sentry;

    constructor(Model: ModelClass<string>, deps: {sentry?: Sentry} = {}) {
        super(Model);
        this.sentry = deps.sentry;
    }

    toPrimitive(entity: ClickEvent): object {
        return {
            id: entity.id,
            recommendation_id: entity.recommendationId,
            member_id: entity.memberId,
            created_at: entity.createdAt
        };
    }

    modelToEntity(model: ModelInstance<string>): ClickEvent | null {
        try {
            return ClickEvent.create({
                id: model.id,
                recommendationId: model.get('recommendation_id') as string,
                memberId: model.get('member_id') as string | null,
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
        } as Record<keyof ClickEvent, string>;
    }
}
