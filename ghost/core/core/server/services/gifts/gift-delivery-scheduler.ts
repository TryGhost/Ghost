import logging from '@tryghost/logging';
import type {SchedulerAdapter, SchedulerJob} from '@tryghost/adapter-base-scheduling';
import type {InternalApiKey, InternalKeys} from '../internal-keys';

const urlUtils = require('../../../shared/url-utils').default;
const {getSignedAdminToken} = require('../../adapters/scheduling/utils');

interface GiftDeliverySchedulerDeps {
    apiUrl: string;
    adapter: SchedulerAdapter;
    internalKeys: InternalKeys;
    findScheduled(): Promise<Array<{id: string; redeemableAt: Date}>>;
}

export class GiftDeliveryScheduler {
    readonly #apiUrl: string;
    readonly #adapter: SchedulerAdapter;
    readonly #internalKeys: InternalKeys;
    readonly #findScheduled: GiftDeliverySchedulerDeps['findScheduled'];
    readonly #scheduledTimes = new Set<number>();

    constructor({apiUrl, adapter, internalKeys, findScheduled}: GiftDeliverySchedulerDeps) {
        this.#apiUrl = apiUrl;
        this.#adapter = adapter;
        this.#internalKeys = internalKeys;
        this.#findScheduled = findScheduled;
        this.#adapter.register(this);
    }

    async scheduleFor(deliveryId: string, redeemableAt: Date): Promise<void> {
        const time = redeemableAt.getTime();
        if (time <= Date.now()) {
            return;
        }

        // The callback flushes every delivery that is due, so deliveries with
        // the same availability time share one scheduled job.
        if (this.#scheduledTimes.has(time)) {
            return;
        }
        this.#scheduledTimes.add(time);

        try {
            const key = await this.#internalKeys.get('ghost-scheduler');
            this.#adapter.schedule(this.#buildJob(time, key));
        } catch (err) {
            this.#scheduledTimes.delete(time);
            logging.error({
                event: {name: 'gift_delivery_scheduler.schedule.failed'},
                err,
                deliveryId
            }, 'Failed to schedule gift delivery');
        }
    }

    async rescheduleAll({previousKey}: {previousKey?: InternalApiKey} = {}): Promise<void> {
        const currentKey = await this.#internalKeys.get('ghost-scheduler');
        const unscheduleKey = previousKey ?? currentKey;
        const scheduled = await this.#findScheduled();
        const bootstrap = !previousKey;
        const scheduledTimes = new Set(scheduled.map(delivery => delivery.redeemableAt.getTime()));

        this.#scheduledTimes.clear();

        for (const time of scheduledTimes) {
            if (time <= Date.now()) {
                continue;
            }
            this.#adapter.unschedule(this.#buildJob(time, unscheduleKey), {bootstrap});
            this.#adapter.schedule(this.#buildJob(time, currentKey));
            this.#scheduledTimes.add(time);
        }
    }

    #buildJob(time: number, key: InternalApiKey): SchedulerJob {
        const signedAdminToken = getSignedAdminToken({
            publishedAt: new Date(time).toISOString(),
            apiUrl: this.#apiUrl,
            key
        });
        const url = new URL(urlUtils.urlJoin(this.#apiUrl, 'gifts', 'flush_deliveries'));
        url.searchParams.set('token', signedAdminToken);
        return {time, url: url.toString(), extra: {httpMethod: 'PUT'}};
    }
}
