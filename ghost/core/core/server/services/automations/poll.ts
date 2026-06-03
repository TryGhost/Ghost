import type * as AutomationsApi from './automations-api';

const MAX_STEPS_PER_BATCH = 100;

type PollOptions = {
    automationsApi: Pick<typeof AutomationsApi,
        'fetchAndLockSteps'
    >;
    enqueueAnotherPollAt: (date: Readonly<Date>) => unknown;
};

export const poll = async ({
    automationsApi,
    enqueueAnotherPollAt
}: Readonly<PollOptions>): Promise<void> => {
    // TODO(NY-1311) Once we're using real tables, we should remove this conditional.
    // Note that unlike triggering, where we only continue if the "automations"
    // flag is enabled, for polling we want to run in all cases. If an
    // automation was enqueued while the flag was on, we want it to run even if
    // the feature was turned off.
    if (
        process.env.NODE_ENV !== 'development'
        && !process.env.NODE_ENV?.startsWith('test')
    ) {
        return;
    }

    const {steps, nextStepReadyAt} = await automationsApi.fetchAndLockSteps(MAX_STEPS_PER_BATCH);

    if (steps.length === 0) {
        if (nextStepReadyAt) {
            enqueueAnotherPollAt(nextStepReadyAt);
        }
        return;
    }

    // TODO(NY-1286) Implement polling. For now, this function is incomplete.
};
