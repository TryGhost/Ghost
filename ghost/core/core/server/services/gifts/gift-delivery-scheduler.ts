import logging from '@tryghost/logging';
import type {SchedulerAdapter, SchedulerJob} from '@tryghost/adapter-base-scheduling';
import type {InternalApiKey, InternalKeys} from '../internal-keys';
import type {Gift} from './gift';

const urlUtils = require('../../../shared/url-utils').default;
const {getSignedAdminToken} = require('../../adapters/scheduling/utils');

interface GiftDeliverySchedulerDeps {
    apiUrl: string;
    adapter?: SchedulerAdapter;
    internalKeys: InternalKeys;
    findPendingDeliveries(): Promise<Gift[]>;
    wake(): void;
}

export class GiftDeliveryScheduler {
    readonly #apiUrl: string;
    readonly #adapter: SchedulerAdapter;
    readonly #internalKeys: InternalKeys;
    readonly #findPendingDeliveries: () => Promise<Gift[]>;
    readonly #wake: () => void;

    constructor({apiUrl, adapter, internalKeys, findPendingDeliveries, wake}: GiftDeliverySchedulerDeps) {
        this.#apiUrl = apiUrl;
        this.#adapter = adapter!;
        this.#internalKeys = internalKeys;
        this.#findPendingDeliveries = findPendingDeliveries;
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
        const pending = await this.#findPendingDeliveries();
        const currentKey = await this.#internalKeys.get('ghost-scheduler');
        const unscheduleKey = previousKey ?? currentKey;
        const bootstrap = !previousKey;
        let hasDueDelivery = false;

        for (const gift of pending) {
            const time = gift.deliveryNextAttemptAt ?? gift.deliverAt;
            if (!time || time.getTime() <= Date.now()) {
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
