import type {AutomationsRepository} from './automations-repository';
import {MAX_STEPS_PER_BATCH} from './constants';

type MemberWelcomeEmailService = {
    init: () => unknown;
    api: {
        sendAutomationEmail: (options: {
            email: {
                designSettingId: string | null;
                lexical: string;
                senderEmail: string | null;
                senderName: string | null;
                senderReplyTo: string | null;
                subject: string;
            };
            member: {
                email: string;
                name: string | null;
                uuid: string;
            };
            memberStatus: 'free' | 'paid';
        }) => Promise<unknown>;
    };
};

type PollOptions = {
    automationsApi: Pick<AutomationsRepository,
        'fetchAndLockSteps' |
        'finishStepAndEnqueueNext' |
        'markStepTerminal' |
        'retryStep'
    >;
    enqueueAnotherPollAt: (date: Readonly<Date>) => unknown;
    memberWelcomeEmailService: MemberWelcomeEmailService;
};

const dateMin = (a: Date | null, b: Date | null): Date | null => {
    if (!a) {
        return b;
    }
    if (!b) {
        return a;
    }
    return a < b ? a : b;
};

export const poll = async ({
    automationsApi,
    enqueueAnotherPollAt,
    memberWelcomeEmailService
}: Readonly<PollOptions>): Promise<void> => {
    // TODO(NY-1311) Once we're using real tables, we should remove this conditional.
    if (
        process.env.NODE_ENV !== 'development'
        && !process.env.NODE_ENV?.startsWith('test')
    ) {
        return;
    }

    const {steps, nextStepReadyAt} = await automationsApi.fetchAndLockSteps(MAX_STEPS_PER_BATCH);

    let nextPollAt = nextStepReadyAt;

    // If the batch is full, we might have more steps to execute later.
    //
    // This could request an unnecessary poll if `steps.length === MAX_STEPS_PER_BATCH`.
    //
    // Alternatively, we could do additional database operations to reliably determine whether an extra poll is needed.
    // For example, we could fetch `MAX_STEPS_PER_BATCH + 1`, or select `COUNT(*)`. I think that complexity is not
    // worth it.
    if (steps.length >= MAX_STEPS_PER_BATCH) {
        nextPollAt = dateMin(nextPollAt, new Date());
    }

    // TODO(NY-1286) Implement polling. For now, this function is a skeleton.

    if (nextPollAt) {
        enqueueAnotherPollAt(nextPollAt);
    }
};
