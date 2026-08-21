import { Gift } from './gift';
import type { SchedulerAdapter } from '@tryghost/adapter-base-scheduling';
import type { InternalApiKey, InternalKeys } from '../internal-keys';
import { GIFT_REMINDER_LEAD_DAYS } from './constants';
import { GiftFlushScheduler } from './gift-flush-scheduler';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const GIFT_REMINDER_LEAD_MS = GIFT_REMINDER_LEAD_DAYS * MS_PER_DAY;

interface GiftReminderSchedulerDeps {
  apiUrl: string;
  adapter: SchedulerAdapter;
  internalKeys: InternalKeys;
  findUnsentReminders(): Promise<Gift[]>;
}

function reminderTime(gift: Gift): number | null {
  if (!gift.consumesAt) {
    return null;
  }
  return gift.consumesAt.getTime() - GIFT_REMINDER_LEAD_MS;
}

export class GiftReminderScheduler {
  readonly #scheduler: GiftFlushScheduler;

  constructor({ apiUrl, adapter, internalKeys, findUnsentReminders }: GiftReminderSchedulerDeps) {
    this.#scheduler = new GiftFlushScheduler({
      apiUrl,
      adapter,
      internalKeys,
      endpoint: 'flush_reminders',
      logEvent: 'gift_reminder_scheduler.schedule.failed',
      logMessage: 'Failed to schedule gift reminder',
      findScheduledTimes: async () => {
        const pending = await findUnsentReminders();
        return pending.map(reminderTime).filter((time): time is number => time !== null);
      },
    });
  }

  /**
   * Queue a reminder callback for a freshly-redeemed gift. The callback
   * fires at consumesAt - GIFT_REMINDER_LEAD_DAYS. Already-due reminders
   * are skipped — the daily cron picks them up.
   */
  async scheduleFor(gift: Gift): Promise<void> {
    const time = reminderTime(gift);
    if (time === null) {
      return;
    }
    await this.#scheduler.scheduleAt(time, { giftToken: gift.token });
  }

  async rescheduleAll(options: { previousKey?: InternalApiKey } = {}): Promise<void> {
    await this.#scheduler.rescheduleAll(options);
  }
}
