import type { SchedulerAdapter } from '@tryghost/adapter-base-scheduling';
import type { InternalApiKey, InternalKeys } from '../internal-keys';
import { GiftFlushScheduler } from './gift-flush-scheduler';

interface GiftDeliverySchedulerDeps {
  apiUrl: string;
  adapter: SchedulerAdapter;
  internalKeys: InternalKeys;
  findScheduled(): Promise<Date[]>;
}

export class GiftDeliveryScheduler {
  readonly #scheduler: GiftFlushScheduler;

  constructor({ apiUrl, adapter, internalKeys, findScheduled }: GiftDeliverySchedulerDeps) {
    this.#scheduler = new GiftFlushScheduler({
      apiUrl,
      adapter,
      internalKeys,
      endpoint: 'flush_deliveries',
      logEvent: 'gift_delivery_scheduler.schedule.failed',
      logMessage: 'Failed to schedule gift delivery',
      findScheduledTimes: async () => {
        const scheduled = await findScheduled();
        return scheduled.map((redeemableAt) => redeemableAt.getTime());
      },
    });
  }

  async scheduleFor(deliveryId: string, redeemableAt: Date): Promise<void> {
    await this.#scheduler.scheduleAt(redeemableAt.getTime(), { deliveryId });
  }

  async rescheduleAll(options: { previousKey?: InternalApiKey } = {}): Promise<void> {
    await this.#scheduler.rescheduleAll(options);
  }
}
