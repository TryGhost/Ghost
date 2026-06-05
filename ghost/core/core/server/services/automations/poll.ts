import type {AutomationsRepository} from './automations-repository';

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

    // TODO(NY-1286) Implement polling. For now, this function is a skeleton.
};
