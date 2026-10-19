import logging from '@tryghost/logging';
import { LABEL_ADDED_POLL_INTERVAL_MS } from './constants';

type LabelAddedPollOptions = Readonly<{
  automationsApi: {
    enqueueLabelAddedRuns: () => Promise<{ hasLabelTriggers: boolean }>;
  };
  enqueueAnotherPollAt: (date: Readonly<Date>) => unknown;
  getNow?: () => Date;
}>;

/**
 * Create a poll that enters members into "label added" automations.
 *
 * Automations polls happen often, especially while a big batch of steps is
 * running, so this only does work every `LABEL_ADDED_POLL_INTERVAL_MS`. Each
 * check is safe to repeat, so it doesn't matter if several processes do this.
 */
export const createLabelAddedPoll = ({
  automationsApi,
  enqueueAnotherPollAt,
  getNow = () => new Date(),
}: LabelAddedPollOptions): (() => Promise<void>) => {
  let lastCheckedAt: null | Date = null;
  let isNextCheckEnqueued = false;

  const enqueueNextCheck = (date: Readonly<Date>) => {
    isNextCheckEnqueued = true;
    enqueueAnotherPollAt(date);
  };

  return async () => {
    const now = getNow();

    if (lastCheckedAt) {
      const nextCheckAt = new Date(lastCheckedAt.getTime() + LABEL_ADDED_POLL_INTERVAL_MS);
      if (now < nextCheckAt) {
        // Something asked for a poll since our last check, like an automation
        // being activated. Make sure we check again later.
        if (!isNextCheckEnqueued) {
          enqueueNextCheck(nextCheckAt);
        }
        return;
      }
    }

    lastCheckedAt = now;
    isNextCheckEnqueued = false;
    const nextCheckAt = new Date(now.getTime() + LABEL_ADDED_POLL_INTERVAL_MS);

    try {
      const { hasLabelTriggers } = await automationsApi.enqueueLabelAddedRuns();
      if (hasLabelTriggers) {
        enqueueNextCheck(nextCheckAt);
      }
    } catch (err) {
      logging.error(
        { err, system: { event: 'automations.label_added_poll.failed' } },
        '[AUTOMATIONS] Failed to enter members into label added automations',
      );
      enqueueNextCheck(nextCheckAt);
    }
  };
};
