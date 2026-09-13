import moment from 'moment';
import logging from '@tryghost/logging';
import type { SchedulerAdapter, SchedulerJob } from '@tryghost/adapter-base-scheduling';
import type { InternalApiKey, InternalKeys } from '../internal-keys';
import { buildSignedJob } from '../../adapters/scheduling/build-signed-job';
import { getSchedulerIdempotencyKey } from '../../adapters/scheduling/get-scheduler-idempotency-key';

// CJS-only modules — typed loosely below. models is the Bookshelf registry
// without TS declarations; the rest are JS modules without types.
const models = require('../../models');
const events = require('../../lib/common/events');

interface PostSchedulingDeps {
  apiUrl: string;
  // Optional in deps so the JS wrapper can pass options.schedulerAdapter
  // through without TS complaining at the JS/TS boundary. The class field
  // below is non-optional; the constructor's adapter.register(this) call
  // throws if undefined is passed through in practice.
  adapter?: SchedulerAdapter;
  internalKeys: InternalKeys;
}

// Pages live in the posts table with type:'page', so both types are
// queried through models.Post and discriminated via the type filter.
const SCHEDULED_RESOURCES = ['post', 'page'] as const;
type ScheduledResource = (typeof SCHEDULED_RESOURCES)[number];

export default class PostScheduling {
  readonly #apiUrl: string;
  readonly #adapter: SchedulerAdapter;
  readonly #internalKeys: InternalKeys;

  constructor({ apiUrl, adapter, internalKeys }: PostSchedulingDeps) {
    this.#apiUrl = apiUrl;
    this.#adapter = adapter!;
    this.#internalKeys = internalKeys;

    SCHEDULED_RESOURCES.forEach((resource) => {
      events.on(`${resource}.scheduled`, async (model: any) => {
        try {
          const key = await internalKeys.get('ghost-scheduler');
          this.#adapter.schedule(this.#normalize({ model, key, resourceType: resource }));
        } catch (err) {
          logging.error(
            {
              event: { name: 'post-scheduling.schedule.error' },
              err,
              resource,
              id: model.get('id'),
            },
            'Failed to schedule resource',
          );
        }
      });

      // Reschedule = matched unschedule + fresh schedule, because tokens
      // are signed against the published_at timestamp.
      events.on(`${resource}.rescheduled`, async (model: any) => {
        try {
          const key = await internalKeys.get('ghost-scheduler');
          this.#adapter.unschedule(
            this.#normalize({ model, key, resourceType: resource }, 'unscheduled'),
          );
          this.#adapter.schedule(this.#normalize({ model, key, resourceType: resource }));
        } catch (err) {
          logging.error(
            {
              event: { name: 'post-scheduling.reschedule.error' },
              err,
              resource,
              id: model.get('id'),
            },
            'Failed to reschedule resource',
          );
        }
      });

      events.on(`${resource}.unscheduled`, async (model: any) => {
        try {
          const key = await internalKeys.get('ghost-scheduler');
          this.#adapter.unschedule(
            this.#normalize({ model, key, resourceType: resource }, 'unscheduled'),
          );
        } catch (err) {
          logging.error(
            {
              event: { name: 'post-scheduling.unschedule.error' },
              err,
              resource,
              id: model.get('id'),
            },
            'Failed to unschedule resource',
          );
        }
      });
    });

    this.#adapter.register(this);
  }

  /**
   * Re-issue every queued schedule under the current internal-keys cache.
   *
   * On boot (no `previousKey`) each job is registered again as-is. Its
   * idempotency key is derived from the fire time and the callback URL, so
   * an adapter with a persistent queue recognises the job it already holds
   * and creates nothing; an in-process adapter starts empty and simply
   * fills up. Nothing is unscheduled: a delete-by-URL sent alongside the
   * create is not ordered against it on the wire, and when the delete
   * lands second it removes the job that was just registered.
   *
   * For key rotation the caller passes `previousKey`. The queued entries
   * were signed under the previous secret, so their URLs differ from the
   * reissued ones; those are unscheduled explicitly and cannot collide with
   * the jobs scheduled under the current secret.
   */
  async rescheduleAll({ previousKey }: { previousKey?: InternalApiKey } = {}): Promise<void> {
    const scheduledResources = await this.#loadScheduledResources();
    const currentKey = await this.#internalKeys.get('ghost-scheduler');

    for (const resourceType of Object.keys(scheduledResources) as ScheduledResource[]) {
      for (const model of scheduledResources[resourceType]) {
        if (previousKey) {
          this.#adapter.unschedule(this.#normalize({ model, key: previousKey, resourceType }));
        }
        this.#adapter.schedule(this.#normalize({ model, key: currentKey, resourceType }));
      }
    }
  }

  async #loadScheduledResources(): Promise<Record<ScheduledResource, any[]>> {
    const entries = await Promise.all(
      SCHEDULED_RESOURCES.map(async (resourceType) => {
        const found = await models.Post.findAll({
          filter: `status:scheduled+type:${resourceType}`,
          columns: ['id', 'published_at', 'created_at', 'type'],
        });
        return [resourceType, found];
      }),
    );
    return Object.fromEntries(entries);
  }

  #normalize(
    {
      model,
      resourceType,
      key,
    }: { model: any; resourceType: ScheduledResource; key: InternalApiKey },
    event: '' | 'unscheduled' = '',
  ): SchedulerJob {
    const resource = `${resourceType}s`;
    const publishedAt =
      event === 'unscheduled' ? model.previous('published_at') : model.get('published_at');
    const previousPublishedAt = model.previous('published_at');
    const time = moment(publishedAt).valueOf();

    return buildSignedJob({
      apiUrl: this.#apiUrl,
      path: ['schedules', resource, `${model.get('id')}/`],
      time,
      key,
      extra: {
        oldTime: previousPublishedAt ? moment(previousPublishedAt).valueOf() : null,
      },
      // The key identifies one job: the URL already carries the resource
      // and a token signed for this fire time under the current signing key,
      // so re-registering the same job (e.g. a boot rebuild) yields the same
      // key, while a reschedule or key rotation yields a new one.
      getIdempotencyKey: (url) =>
        getSchedulerIdempotencyKey({ namespace: 'post-scheduling', date: new Date(time), url }),
    });
  }
}
