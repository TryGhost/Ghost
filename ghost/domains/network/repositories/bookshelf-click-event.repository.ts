import { BookshelfRepository, ModelClass, ModelInstance } from './bookshelf.repository';
import { ClickEvent } from '../entities/click-event.entity';
import type { GhostLogger } from '@tryghost/logging';
import type { Site } from '#support/site';
import { models } from '../../../shared/transition/models';
import { sentry } from '../../../shared/transition/sentry';

type Sentry = {
  captureException(err: unknown): void;
};

export class BookshelfClickEventRepository extends BookshelfRepository<string, ClickEvent> {
  sentry?: Sentry;
  logging: Pick<GhostLogger, 'error'>;

  constructor(
    Model: ModelClass<string>,
    deps: { sentry?: Sentry; logging: Pick<GhostLogger, 'error'> },
  ) {
    super(Model);
    this.sentry = deps.sentry;
    this.logging = deps.logging;
  }

  toPrimitive(entity: ClickEvent): object {
    return {
      id: entity.id,
      recommendation_id: entity.recommendationId,
      member_id: entity.memberId,
      created_at: entity.createdAt,
    };
  }

  modelToEntity(model: ModelInstance<string>): ClickEvent | null {
    try {
      return ClickEvent.create({
        id: model.id,
        recommendationId: model.get('recommendation_id') as string,
        memberId: model.get('member_id') as string | null,
        createdAt: model.get('created_at') as Date,
      });
    } catch (err) {
      this.logging.error(err);
      this.sentry?.captureException(err);
      return null;
    }
  }

  getFieldToColumnMap() {
    return {
      id: 'id',
      recommendationId: 'recommendation_id',
      memberId: 'member_id',
      createdAt: 'created_at',
    } as Record<keyof ClickEvent, string>;
  }
}

export const clickEventRepository = (site: Site) =>
  new BookshelfClickEventRepository(models(site).RecommendationClickEvent, {
    sentry: sentry(site),
    logging: site.log,
  });

// Subscribe events have always been stored through the click-event repository
// class, given the subscribe-event model. Kept as it was.
export const subscribeEventRepository = (site: Site) =>
  new BookshelfClickEventRepository(models(site).RecommendationSubscribeEvent, {
    sentry: sentry(site),
    logging: site.log,
  });
