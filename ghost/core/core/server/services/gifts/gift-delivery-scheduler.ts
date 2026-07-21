import logging from '@tryghost/logging';
import {Gift} from './gift';
import type {SchedulerAdapter, SchedulerJob} from '@tryghost/adapter-base-scheduling';
import type {InternalApiKey, InternalKeys} from '../internal-keys';
// Same-domain (scheduling) primitives, used unconditionally.
const urlUtils = require('../../../shared/url-utils');
const {getSignedAdminToken} = require('../../adapters/scheduling/utils');

interface GiftDeliverySchedulerDeps {
    apiUrl: string;
    // Optional in deps so the JS wrapper can pass options.schedulerAdapter
    // through without TS complaining at the JS/TS boundary. The class field
    // below is non-optional; the constructor's adapter.register(this) call
    // throws if undefined is passed through in practice.
    adapter?: SchedulerAdapter;
    internalKeys: InternalKeys;
    findUnsentDeliveries(): Promise<Gift[]>;
}

export class GiftDeliveryScheduler {
    readonly #apiUrl: string;
    readonly #adapter: SchedulerAdapter;
    readonly #internalKeys: InternalKeys;
    readonly #findUnsentDeliveries: () => Promise<Gift[]>;

    constructor({apiUrl, adapter, internalKeys, findUnsentDeliveries}: GiftDeliverySchedulerDeps) {
        this.#apiUrl = apiUrl;
        this.#adapter = adapter!;
        this.#internalKeys = internalKeys;
        this.#findUnsentDeliveries = findUnsentDeliveries;
        this.#adapter.register(this);
    }

    /**
     * Queue a single delivery callback for a freshly-purchased scheduled
     * gift. The callback fires at deliverAt. Already-due deliveries are
     * skipped — the daily cron picks them up.
     */
    async scheduleFor(gift: Gift): Promise<void> {
        if (!gift.deliverAt) {
            return;
        }
        const time = gift.deliverAt.getTime();
        if (time <= Date.now()) {
            return;
        }

        try {
            const key = await this.#internalKeys.get('ghost-scheduler');
            this.#adapter.schedule(this.#buildJob(time, key));
        } catch (err) {
            logging.error({
                event: {name: 'gift_delivery_scheduler.schedule.failed'},
                err,
                giftToken: gift.token
            }, 'Failed to schedule gift delivery');
        }
    }

    /**
     * Re-issue every queued delivery under the current scheduler key. Pass
     * the pre-rotation secret as `previousKey` so each adapter-queued URL
     * can be reconstructed for unschedule before resigning with the new
     * key. Deliveries whose fire time has already passed are skipped — the
     * daily cron picks them up.
     */
    async rescheduleAll({previousKey}: {previousKey?: InternalApiKey} = {}): Promise<void> {
        const currentKey = await this.#internalKeys.get('ghost-scheduler');
        const unscheduleKey = previousKey ?? currentKey;
        const pending = await this.#findUnsentDeliveries();

        // Same-key rebuild (no previousKey, boot path) → URL signature is
        // identical to the about-to-be-scheduled job. The default adapter
        // implements unschedule via tombstones keyed by URL+time, so a same-URL
        // unschedule poisons the scheduled job. Bootstrap mode skips the
        // tombstone write. Rotation (previousKey provided) → URLs differ, so
        // the tombstone correctly targets the old queued entry.
        const bootstrap = !previousKey;

        for (const gift of pending) {
            if (!gift.deliverAt) {
                continue;
            }
            const time = gift.deliverAt.getTime();
            if (time <= Date.now()) {
                continue;
            }
            this.#adapter.unschedule(this.#buildJob(time, unscheduleKey), {bootstrap});
            this.#adapter.schedule(this.#buildJob(time, currentKey));
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
