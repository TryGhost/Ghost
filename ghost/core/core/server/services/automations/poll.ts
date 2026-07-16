import type {AutomationStepToRun, AutomationsRepository} from './automations-repository';
import type {RecordEmailSentOptions} from './automations-api';
import {getMailgunMessageId} from './mailgun-message-id';
import logging from '@tryghost/logging';
import errors from '@tryghost/errors';
import {MEMBER_WELCOME_EMAIL_ELIGIBLE_STATUSES, MEMBER_WELCOME_EMAIL_SLUGS} from '../member-welcome-emails/constants';
import {MAX_ATTEMPTS, MAX_STEPS_PER_BATCH, RETRY_DELAY_MS} from './constants';
// @ts-expect-error Models currently lack type definitions.
import {Member} from '../../models';

const settingsCache = require('../../../shared/settings-cache');

type MemberWelcomeEmailService = {
    init: () => unknown;
    api: {
        sendAutomationEmail: (options: {
            email: {
                designSettingId: string | null;
                lexical: string;
                subject: string;
            };
            member: {
                email: string;
                name: string | null;
                uuid: string;
            };
            memberStatus: 'free' | 'paid';
            trackOpens: boolean;
        }) => Promise<unknown>;
    };
};

type MemberModel = {
    get(key: 'name'): string | null;
    get(key: 'email' | 'status' | 'uuid'): string;
    get(key: 'enable_updates_and_announcements'): boolean | null;
    related(key: 'newsletters'): {
        models: unknown[];
    };
};

type PollOptions = {
    automationsApi: Pick<AutomationsRepository,
        'fetchAndLockSteps' |
        'finishStepAndEnqueueNext' |
        'markStepTerminal' |
        'retryStep'
    > & {
        recordEmailSent(options: RecordEmailSentOptions): Promise<void>;
    };
    enqueueAnotherPollAt: (date: Readonly<Date>) => unknown;
    scheduleAutomationEmailAnalyticsJob: () => Promise<void>;
    memberWelcomeEmailService: MemberWelcomeEmailService;
};

const slugToMemberStatus = new Map<string, 'free' | 'paid'>(
    Object.entries(MEMBER_WELCOME_EMAIL_SLUGS).map(([status, slug]) => [slug as string, status as 'free' | 'paid'])
);

const hasUpdatesAndAnnouncementsEnabled = (member: MemberModel): boolean => {
    const preference = member.get('enable_updates_and_announcements');

    if (preference !== null) {
        return preference;
    }

    const isSubscribedToAnyNewsletters = member.related('newsletters').models.length > 0;
    return isSubscribedToAnyNewsletters;
};

const markMaxAttemptsExceeded = async (automationsApi: PollOptions['automationsApi'], step: AutomationStepToRun): Promise<void> => {
    await automationsApi.markStepTerminal(step, 'failed');
    logging.warn({
        system: {
            event: 'automations.poll.max_attempts',
            step_id: step.id
        }
    }, `[AUTOMATIONS] Step ${step.id} exceeded max attempts`);
};

const handleStepExecutionFailure = async ({
    automationsApi,
    err,
    step
}: Readonly<{
    automationsApi: PollOptions['automationsApi'];
    err: unknown;
    step: AutomationStepToRun;
}>): Promise<Date | null> => {
    logging.error({
        err,
        system: {
            event: 'automations.poll.step_execution_failed',
            step_id: step.id
        }
    }, `[AUTOMATIONS] Failed to execute automation step ${step.id}`);

    if (step.step_attempts < MAX_ATTEMPTS) {
        const retryAt = new Date(Date.now() + RETRY_DELAY_MS);
        const didRetry = await automationsApi.retryStep(step, retryAt);
        if (didRetry) {
            return retryAt;
        }
    } else {
        await markMaxAttemptsExceeded(automationsApi, step);
    }

    return null;
};

const processStep = async ({
    automationsApi,
    memberWelcomeEmailService,
    scheduleAutomationEmailAnalyticsJob,
    step
}: Readonly<Pick<PollOptions, 'automationsApi' | 'memberWelcomeEmailService' | 'scheduleAutomationEmailAnalyticsJob'> & {
    step: AutomationStepToRun;
}>): Promise<Date | null> => {
    if (step.automation_status !== 'active') {
        await automationsApi.markStepTerminal(step, 'automation disabled');
        return null;
    }

    if (step.step_attempts > MAX_ATTEMPTS) {
        await markMaxAttemptsExceeded(automationsApi, step);
        return null;
    }

    // NOTE: This will change once we support additional automation triggers.
    const memberStatus = slugToMemberStatus.get(step.automation_slug);
    if (!memberStatus) {
        logging.error({
            system: {
                event: 'automations.poll.unknown_slug',
                slug: step.automation_slug,
                step_id: step.id
            }
        }, `[AUTOMATIONS] Unknown automation slug: ${step.automation_slug}`);
        await automationsApi.markStepTerminal(step, 'failed');
        return null;
    }

    if (!step.member_id) {
        await automationsApi.markStepTerminal(step, 'member unsubscribed');
        return null;
    }

    const member = await Member.findOne({id: step.member_id}, {withRelated: ['newsletters']}) as MemberModel | null;

    if (!member) {
        // It's possible that the member was deleted between the time the step was fetched and now, though it's
        // unlikely. That's why we log a warning, not an error.
        logging.warn({
            system: {
                event: 'automations.poll.member_missing',
                member_id: step.member_id,
                step_id: step.id
            }
        }, `[AUTOMATIONS] Member ${step.member_id} for step ${step.id} doesn't exist`);
        await automationsApi.markStepTerminal(step, 'member unsubscribed');
        return null;
    }

    const eligibleStatuses = MEMBER_WELCOME_EMAIL_ELIGIBLE_STATUSES[memberStatus] as readonly string[];
    if (!eligibleStatuses.includes(member.get('status') ?? '')) {
        await automationsApi.markStepTerminal(step, 'member changed status');
        return null;
    }

    let nextReadyAt: Date | null = null;

    try {
        switch (step.type) {
        case 'wait':
            break;
        case 'send_email': {
            if (!hasUpdatesAndAnnouncementsEnabled(member)) {
                logging.info({
                    system: {
                        event: 'automations.poll.skipped_unsubscribed_member',
                        member_id: step.member_id,
                        step_id: step.id
                    }
                }, `[AUTOMATIONS] Member ${step.member_id} for step ${step.id} has unsubscribed from emails. Fast-finishing this step`);
                break;
            }
            memberWelcomeEmailService.init();
            const trackOpens = Boolean(settingsCache.get('email_track_opens'));
            const sendResult = await memberWelcomeEmailService.api.sendAutomationEmail({
                email: {
                    designSettingId: step.email_design_setting_id,
                    lexical: step.email_lexical,
                    subject: step.email_subject
                },
                member: {
                    email: member.get('email'),
                    name: member.get('name'),
                    uuid: member.get('uuid')
                },
                memberStatus,
                trackOpens
            });
            const mailgunMessageId = getMailgunMessageId(sendResult);
            // Only Mailgun sends can produce open events for automation emails
            const trackOpensForRecipient = trackOpens && Boolean(mailgunMessageId);
            try {
                await automationsApi.recordEmailSent({
                    automationActionRevisionId: step.automation_action_revision_id,
                    ...(mailgunMessageId ? {mailgunMessageId} : {}),
                    memberEmail: member.get('email'),
                    memberId: step.member_id,
                    memberName: member.get('name'),
                    memberUuid: member.get('uuid'),
                    trackOpens: trackOpensForRecipient
                });
            } catch (err) {
                logging.error({
                    err,
                    system: {
                        event: 'automations.poll.recipient_persistence_failed',
                        member_id: step.member_id,
                        step_id: step.id
                    }
                }, `[AUTOMATIONS] Failed to record automated email recipient for step ${step.id}`);
            }
            try {
                await scheduleAutomationEmailAnalyticsJob();
            } catch (err) {
                logging.error({
                    err,
                    system: {
                        event: 'automations.poll.analytics_scheduling_failed',
                        member_id: step.member_id,
                        step_id: step.id
                    }
                }, `[AUTOMATIONS] Failed to schedule email analytics job for step ${step.id}`);
            }
            break;
        }
        default: {
            const _exhaustive: never = step;
            throw new errors.InternalServerError({
                message: `Unexpected automation step type ${_exhaustive}`
            });
        }
        }

        nextReadyAt = await automationsApi.finishStepAndEnqueueNext(step);
    } catch (err) {
        return await handleStepExecutionFailure({
            automationsApi,
            err,
            step
        });
    }

    return nextReadyAt;
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
    scheduleAutomationEmailAnalyticsJob,
    memberWelcomeEmailService
}: Readonly<PollOptions>): Promise<void> => {
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

    await Promise.all(steps.map(async (step) => {
        try {
            const stepNextPollAt = await processStep({
                automationsApi,
                memberWelcomeEmailService,
                scheduleAutomationEmailAnalyticsJob,
                step
            });
            nextPollAt = dateMin(nextPollAt, stepNextPollAt);
        } catch (err) {
            logging.error({
                err,
                system: {
                    event: 'automations.poll.step_failed',
                    step_id: step.id
                }
            }, `[AUTOMATIONS] Failed to process automation step ${step.id}`);
            return;
        }
    }));

    if (nextPollAt) {
        enqueueAnotherPollAt(nextPollAt);
    }
};
