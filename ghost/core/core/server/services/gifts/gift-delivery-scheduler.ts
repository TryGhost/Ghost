import logging from '@tryghost/logging';
import type {SchedulerAdapter, SchedulerJob} from '@tryghost/adapter-base-scheduling';
import type {InternalApiKey, InternalKeys} from '../internal-keys';
import type {GiftDeliverySchedule} from './gift-delivery-bookshelf-repository';

const urlUtils = require('../../../shared/url-utils').default;
const {getSignedAdminToken} = require('../../adapters/scheduling/utils');
const GIFT_DELIVERY_STUCK_THRESHOLD_MS = 10 * 60 * 1000;

interface GiftDeliverySchedulerDeps {
    apiUrl: string;
    adapter?: SchedulerAdapter;
    internalKeys: InternalKeys;
    findPendingDeliveries(): Promise<GiftDeliverySchedule[]>;
    countStuckDeliveries(before: Date): Promise<number>;
    wake(): void;
}

export class GiftDeliveryScheduler {
    readonly #apiUrl: string;
    readonly #adapter: SchedulerAdapter;
    readonly #internalKeys: InternalKeys;
    readonly #findPendingDeliveries: () => Promise<GiftDeliverySchedule[]>;
    readonly #countStuckDeliveries: (before: Date) => Promise<number>;
    readonly #wake: () => void;

    constructor({apiUrl, adapter, internalKeys, findPendingDeliveries, countStuckDeliveries, wake}: GiftDeliverySchedulerDeps) {
        this.#apiUrl = apiUrl;
        this.#adapter = adapter!;
        this.#internalKeys = internalKeys;
        this.#findPendingDeliveries = findPendingDeliveries;
        this.#countStuckDeliveries = countStuckDeliveries;
        this.#wake = wake;
        this.#adapter.register(this);
    }

    wake(): void {
        this.#wake();
    }

    async scheduleAt(time: Date): Promise<void> {
        if (time.getTime() <= Date.now()) {
            this.wake();
            return;
        }

        try {
            const key = await this.#internalKeys.get('ghost-scheduler');
            this.#adapter.schedule(this.#buildJob(time.getTime(), key));
        } catch (err) {
            logging.error({
                event: {name: 'gift_delivery_scheduler.schedule.failed'},
                err,
                time
            }, 'Failed to schedule gift delivery');
        }
    }

    async recoverAll({previousKey}: {previousKey?: InternalApiKey} = {}): Promise<void> {
        const stuckBefore = new Date(Date.now() - GIFT_DELIVERY_STUCK_THRESHOLD_MS);

        try {
            const stuckCount = await this.#countStuckDeliveries(stuckBefore);

            if (stuckCount > 0) {
                logging.warn({
                    event: {name: 'gift_delivery_scheduler.stuck'},
                    count: stuckCount,
                    stuckBefore
                }, `Found ${stuckCount} gift deliveries stuck in sending`);
            }
        } catch (err) {
            logging.error({
                event: {name: 'gift_delivery_scheduler.stuck_check.failed'},
                err,
                stuckBefore
            }, 'Failed to check for stuck gift deliveries');
        }

        const pending = await this.#findPendingDeliveries();
        const currentKey = await this.#internalKeys.get('ghost-scheduler');
        const unscheduleKey = previousKey ?? currentKey;
        const bootstrap = !previousKey;
        let hasDueDelivery = false;

        for (const {availableAt} of pending) {
            const time = availableAt;
            if (time.getTime() <= Date.now()) {
                hasDueDelivery = true;
                continue;
            }

            this.#adapter.unschedule(this.#buildJob(time.getTime(), unscheduleKey), {bootstrap});
            this.#adapter.schedule(this.#buildJob(time.getTime(), currentKey));
        }

        if (hasDueDelivery) {
            this.wake();
        }
    }

    async rescheduleAll({previousKey}: {previousKey?: InternalApiKey} = {}): Promise<void> {
        await this.recoverAll({previousKey});
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
