import assert from 'node:assert/strict';
import sinon from 'sinon';

import {poll} from '../../../../../core/server/services/automations/poll';
import type {AutomationStepToRun} from '../../../../../core/server/services/automations/automations-repository';
import {MEMBER_WELCOME_EMAIL_SLUGS} from '../../../../../core/server/services/member-welcome-emails/constants';
// @ts-expect-error Models currently lack type definitions.
import {Member} from '../../../../../core/server/models';

const settingsCache = require('../../../../../core/shared/settings-cache');

const MAX_STEPS_PER_BATCH = 100;
const RETRY_DELAY_MS = 10 * 60 * 1000;

type WaitStep = Extract<AutomationStepToRun, {type: 'wait'}>;
type SendEmailStep = Extract<AutomationStepToRun, {type: 'send_email'}>;
type StepSpecificField =
    | 'type'
    | 'wait_hours'
    | 'email_subject'
    | 'email_lexical'
    | 'email_design_setting_id';
type StepBase = Omit<AutomationStepToRun, StepSpecificField>;
type PollOptions = Parameters<typeof poll>[0];
type AutomationsApi = PollOptions['automationsApi'];

type StubbedFunction<TFunction extends (..._args: never[]) => unknown> = sinon.SinonStub<Parameters<TFunction>, ReturnType<TFunction>>;

type AutomationsApiStubs = {
    [Method in keyof PollOptions['automationsApi']]: StubbedFunction<PollOptions['automationsApi'][Method]>;
};

type MemberWelcomeEmailServiceStubs = PollOptions['memberWelcomeEmailService'] & {
    init: StubbedFunction<PollOptions['memberWelcomeEmailService']['init']>;
    api: PollOptions['memberWelcomeEmailService']['api'] & {
        loadMemberWelcomeEmails: sinon.SinonStub<[], Promise<void>>;
        sendAutomationEmail: StubbedFunction<PollOptions['memberWelcomeEmailService']['api']['sendAutomationEmail']>;
    };
};

type PollOptionsStubs = PollOptions & {
    automationsApi: AutomationsApiStubs;
    enqueueAnotherPollAt: StubbedFunction<PollOptions['enqueueAnotherPollAt']>;
    memberWelcomeEmailService: MemberWelcomeEmailServiceStubs;
};

type MemberFixture = {
    email: string;
    name: string;
    status: string;
    uuid: string;
    enable_updates_and_announcements: boolean | null;
    newsletters: unknown[];
};

const fake = <TFunction extends(..._args: never[]) => unknown>(): StubbedFunction<TFunction> => (
    sinon.stub<Parameters<TFunction>, ReturnType<TFunction>>()
);

function buildMember(attrs: Partial<MemberFixture> = {}) {
    const values: MemberFixture = {
        email: 'member@example.com',
        name: 'Test Member',
        status: 'free',
        uuid: '00000000-0000-4000-8000-000000000001',
        enable_updates_and_announcements: true,
        newsletters: [{}],
        ...attrs
    };

    return {
        get(key: keyof MemberFixture): string | boolean | null | unknown[] {
            return values[key];
        },
        related(key: 'newsletters') {
            return {
                models: values[key]
            };
        }
    };
}

function buildStep(attrs: Partial<StepBase> = {}): StepBase {
    return {
        id: `step-${Math.random()}`,
        locked_by: 'lock-id',
        automation_run_id: 'run-id',
        automation_id: 'automation-id',
        automation_slug: MEMBER_WELCOME_EMAIL_SLUGS.free,
        automation_status: 'active',
        member_id: 'member-id',
        member_email: 'member@example.com',
        action_id: 'action-id',
        automation_action_revision_id: 'revision-id',
        ready_at: new Date(),
        step_attempts: 1,
        ...attrs
    } satisfies StepBase;
}

function buildWaitStep(attrs: Partial<WaitStep> = {}): WaitStep {
    return {
        ...buildStep(attrs),
        type: 'wait',
        wait_hours: 24,
        ...attrs
    } satisfies WaitStep;
}

function buildEmailStep(attrs: Partial<SendEmailStep> = {}): SendEmailStep {
    return {
        ...buildStep(attrs),
        type: 'send_email',
        email_subject: 'Welcome!',
        email_lexical: JSON.stringify({root: {children: [], direction: null, format: '', indent: 0, type: 'root', version: 1}}),
        email_design_setting_id: null,
        ...attrs
    } satisfies SendEmailStep;
}

describe('automations poll', function () {
    let automationsApi: AutomationsApiStubs;
    let memberWelcomeEmailService: MemberWelcomeEmailServiceStubs;
    let scheduleAutomationEmailAnalyticsJob: sinon.SinonStub;
    let options: PollOptionsStubs;
    let settingsCacheGet: sinon.SinonStub;

    beforeEach(function () {
        sinon.useFakeTimers({now: new Date('2026-01-01T12:00:00.000Z'), shouldAdvanceTime: true});

        automationsApi = {
            fetchAndLockSteps: fake<AutomationsApi['fetchAndLockSteps']>().resolves({steps: [], nextStepReadyAt: null}),
            finishStepAndEnqueueNext: fake<AutomationsApi['finishStepAndEnqueueNext']>().resolves(null),
            markStepTerminal: fake<AutomationsApi['markStepTerminal']>().resolves(true),
            recordEmailSent: fake<AutomationsApi['recordEmailSent']>().resolves(),
            retryStep: fake<AutomationsApi['retryStep']>().resolves(true)
        };

        memberWelcomeEmailService = {
            init: fake<PollOptions['memberWelcomeEmailService']['init']>(),
            api: {
                loadMemberWelcomeEmails: sinon.stub<[], Promise<void>>().resolves(),
                sendAutomationEmail: fake<PollOptions['memberWelcomeEmailService']['api']['sendAutomationEmail']>().resolves()
            }
        };

        scheduleAutomationEmailAnalyticsJob = sinon.stub().resolves();

        options = {
            automationsApi,
            enqueueAnotherPollAt: fake<PollOptions['enqueueAnotherPollAt']>(),
            scheduleAutomationEmailAnalyticsJob,
            memberWelcomeEmailService
        };

        settingsCacheGet = sinon.stub(settingsCache, 'get');
        settingsCacheGet.withArgs('email_track_clicks').returns(false);
        settingsCacheGet.withArgs('email_track_opens').returns(false);
        sinon.stub(Member, 'findOne').resolves(buildMember());
    });

    afterEach(function () {
        sinon.restore();
    });

    it('does nothing when no steps are ready', async function () {
        await poll(options);

        sinon.assert.calledOnceWithExactly(automationsApi.fetchAndLockSteps, MAX_STEPS_PER_BATCH);
        sinon.assert.notCalled(options.enqueueAnotherPollAt);
        sinon.assert.notCalled(memberWelcomeEmailService.init);
    });

    it('does not run when no steps are ready, but does enqueue a future poll if one will be ready in the future', async function () {
        const nextStepReadyAt = new Date(Date.now() + 60 * 1000);
        automationsApi.fetchAndLockSteps.resolves({steps: [], nextStepReadyAt});

        await poll(options);

        sinon.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, nextStepReadyAt);
        sinon.assert.notCalled(memberWelcomeEmailService.init);
    });

    it('keeps processing other steps if one step execution fails', async function () {
        const step1 = buildWaitStep({id: 'step-1'});
        const step2 = buildWaitStep({id: 'step-2'});
        const pollStart = Date.now();
        automationsApi.fetchAndLockSteps.resolves({steps: [step1, step2], nextStepReadyAt: null});
        automationsApi.finishStepAndEnqueueNext.withArgs(step1).rejects(new Error('finish failed'));
        automationsApi.finishStepAndEnqueueNext.withArgs(step2).resolves();

        await poll(options);

        const retryAt = automationsApi.retryStep.firstCall.args[1];
        assert.ok(Math.abs(retryAt.getTime() - (pollStart + RETRY_DELAY_MS)) < 2000);
        sinon.assert.calledWith(automationsApi.finishStepAndEnqueueNext, step1);
        sinon.assert.calledWith(automationsApi.finishStepAndEnqueueNext, step2);
        sinon.assert.calledOnceWithExactly(automationsApi.retryStep, step1, retryAt);
        sinon.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, retryAt);
    });

    it('enqueues another immediate poll when the batch is full', async function () {
        const beforePoll = new Date();
        automationsApi.fetchAndLockSteps.resolves({
            steps: Array.from({length: MAX_STEPS_PER_BATCH}, () => buildWaitStep()),
            nextStepReadyAt: null
        });

        await poll(options);

        const afterPoll = new Date();

        sinon.assert.calledWith(options.enqueueAnotherPollAt, sinon.match(date => (
            date instanceof Date &&
            date >= beforePoll &&
            date <= afterPoll
        )));
    });

    it('marks the step failed without sending when max attempts are exceeded', async function () {
        const nextStepReadyAt = new Date(Date.now() + 60 * 1000);
        const step = buildEmailStep({step_attempts: 11});
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt});

        await poll(options);

        sinon.assert.notCalled(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon.assert.calledOnceWithExactly(automationsApi.markStepTerminal, step, 'failed');
        sinon.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, nextStepReadyAt);
    });

    it('bails if the automation is inactive', async function () {
        const step = buildEmailStep({automation_status: 'inactive'});
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});

        await poll(options);

        sinon.assert.notCalled(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon.assert.calledOnceWithExactly(automationsApi.markStepTerminal, step, 'automation disabled');
    });

    it('bails if the member no longer exists', async function () {
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        Member.findOne.resolves(null);

        await poll(options);

        sinon.assert.notCalled(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon.assert.calledOnceWithExactly(automationsApi.markStepTerminal, step, 'member unsubscribed');
    });

    it('bails if the member status changed', async function () {
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        Member.findOne.resolves(buildMember({status: 'paid'}));

        await poll(options);

        sinon.assert.notCalled(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon.assert.calledOnceWithExactly(automationsApi.markStepTerminal, step, 'member changed status');
    });

    it('skips sending email if the member unsubscribed from updates & announcements', async function () {
        const nextReadyAt = new Date(Date.now() + 60 * 1000);
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        automationsApi.finishStepAndEnqueueNext.resolves(nextReadyAt);
        Member.findOne.resolves(buildMember({enable_updates_and_announcements: false}));

        await poll(options);

        sinon.assert.notCalled(memberWelcomeEmailService.init);
        sinon.assert.notCalled(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon.assert.notCalled(automationsApi.recordEmailSent);
        sinon.assert.notCalled(automationsApi.markStepTerminal);
        sinon.assert.calledOnceWithExactly(automationsApi.finishStepAndEnqueueNext, step);
        sinon.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, nextReadyAt);
    });

    it('sends email if updates & announcements is unset and the member has newsletter subscriptions', async function () {
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        Member.findOne.resolves(buildMember({
            enable_updates_and_announcements: null,
            newsletters: [{}]
        }));

        await poll(options);

        sinon.assert.calledOnce(memberWelcomeEmailService.init);
        sinon.assert.calledOnce(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon.assert.calledOnceWithExactly(automationsApi.finishStepAndEnqueueNext, step);
    });

    it('skips sending email if updates & announcements is unset and the member has no newsletter subscriptions', async function () {
        const nextReadyAt = new Date(Date.now() + 60 * 1000);
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        automationsApi.finishStepAndEnqueueNext.resolves(nextReadyAt);
        Member.findOne.resolves(buildMember({
            enable_updates_and_announcements: null,
            newsletters: []
        }));

        await poll(options);

        sinon.assert.notCalled(memberWelcomeEmailService.init);
        sinon.assert.notCalled(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon.assert.notCalled(automationsApi.recordEmailSent);
        sinon.assert.notCalled(automationsApi.markStepTerminal);
        sinon.assert.calledOnceWithExactly(automationsApi.finishStepAndEnqueueNext, step);
        sinon.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, nextReadyAt);
    });

    it('gift members run through paid automations', async function () {
        const step = buildEmailStep({
            automation_slug: MEMBER_WELCOME_EMAIL_SLUGS.paid
        });
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        Member.findOne.resolves(buildMember({status: 'gift'}));

        await poll(options);

        sinon.assert.calledOnceWithExactly(memberWelcomeEmailService.api.sendAutomationEmail, sinon.match({
            memberStatus: 'paid'
        }));
        sinon.assert.calledOnceWithExactly(automationsApi.finishStepAndEnqueueNext, step);
    });

    it('sends email revision content and enqueues the next step', async function () {
        const nextReadyAt = new Date(Date.now() + 60 * 1000);
        const step = buildEmailStep({email_design_setting_id: 'design-id'});
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        automationsApi.finishStepAndEnqueueNext.resolves(nextReadyAt);

        await poll(options);

        sinon.assert.calledOnce(memberWelcomeEmailService.init);
        sinon.assert.calledOnceWithExactly(memberWelcomeEmailService.api.sendAutomationEmail, sinon.match({
            email: {
                designSettingId: 'design-id',
                lexical: step.email_lexical,
                subject: 'Welcome!'
            },
            memberStatus: 'free'
        }));
        sinon.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, nextReadyAt);
    });

    it('records the automated email recipient after sending email revision content', async function () {
        const step = buildEmailStep({
            automation_action_revision_id: 'revision-id'
        });
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        memberWelcomeEmailService.api.sendAutomationEmail.resolves({
            id: ' <mailgun-message-id> '
        });

        await poll(options);

        sinon.assert.calledOnceWithExactly(memberWelcomeEmailService.api.sendAutomationEmail, sinon.match({
            trackOpens: false
        }));
        sinon.assert.calledOnceWithExactly(automationsApi.recordEmailSent, {
            automationActionRevisionId: 'revision-id',
            mailgunMessageId: 'mailgun-message-id',
            memberEmail: 'member@example.com',
            memberId: 'member-id',
            memberName: 'Test Member',
            memberUuid: '00000000-0000-4000-8000-000000000001',
            trackClicks: false,
            trackOpens: false
        });
        sinon.assert.callOrder(
            memberWelcomeEmailService.api.sendAutomationEmail,
            automationsApi.recordEmailSent,
            scheduleAutomationEmailAnalyticsJob,
            automationsApi.finishStepAndEnqueueNext
        );
    });

    it('enables open tracking for the send and recipient when the setting is enabled', async function () {
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        settingsCacheGet.withArgs('email_track_opens').returns(true);
        memberWelcomeEmailService.api.sendAutomationEmail.resolves({id: '<mailgun-message-id>'});

        await poll(options);

        sinon.assert.calledOnceWithExactly(memberWelcomeEmailService.api.sendAutomationEmail, sinon.match({
            trackOpens: true
        }));
        sinon.assert.calledOnceWithExactly(automationsApi.recordEmailSent, sinon.match({
            trackOpens: true
        }));
    });

    it('does not enable open tracking for the send and recipient when the setting is disabled', async function () {
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        settingsCacheGet.withArgs('email_track_opens').returns(false);
        memberWelcomeEmailService.api.sendAutomationEmail.resolves({id: '<mailgun-message-id>'});

        await poll(options);

        sinon.assert.calledOnceWithExactly(memberWelcomeEmailService.api.sendAutomationEmail, sinon.match({
            trackOpens: false
        }));
        sinon.assert.calledOnceWithExactly(automationsApi.recordEmailSent, sinon.match({
            trackOpens: false
        }));
    });

    it('does not schedule email analytics when the send has no Mailgun message ID', async function () {
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        memberWelcomeEmailService.api.sendAutomationEmail.resolves({
            messageId: '<smtp-message-id>',
            response: '250 Message accepted'
        });

        await poll(options);

        sinon.assert.notCalled(scheduleAutomationEmailAnalyticsJob);
    });

    it('snapshots enabled click tracking on the recipient', async function () {
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        settingsCacheGet.withArgs('email_track_clicks').returns(true);

        await poll(options);

        sinon.assert.calledOnceWithExactly(automationsApi.recordEmailSent, sinon.match({
            trackClicks: true
        }));
    });

    it('snapshots disabled click tracking on the recipient', async function () {
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        settingsCacheGet.withArgs('email_track_clicks').returns(false);

        await poll(options);

        sinon.assert.calledOnceWithExactly(automationsApi.recordEmailSent, sinon.match({
            trackClicks: false
        }));
    });

    it('records the automated email recipient without a Mailgun message ID after an SMTP send', async function () {
        const step = buildEmailStep({
            automation_action_revision_id: 'revision-id'
        });
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        settingsCacheGet.withArgs('email_track_opens').returns(true);
        memberWelcomeEmailService.api.sendAutomationEmail.resolves({
            messageId: '<smtp-message-id>',
            response: '250 Message accepted'
        });

        await poll(options);

        sinon.assert.calledOnceWithExactly(memberWelcomeEmailService.api.sendAutomationEmail, sinon.match({
            trackOpens: true
        }));
        sinon.assert.calledOnceWithExactly(automationsApi.recordEmailSent, {
            automationActionRevisionId: 'revision-id',
            memberEmail: 'member@example.com',
            memberId: 'member-id',
            memberName: 'Test Member',
            memberUuid: '00000000-0000-4000-8000-000000000001',
            trackClicks: false,
            trackOpens: false
        });
        sinon.assert.callOrder(
            memberWelcomeEmailService.api.sendAutomationEmail,
            automationsApi.recordEmailSent,
            automationsApi.finishStepAndEnqueueNext
        );
    });

    it('does not retry the email send when recording the automated email recipient fails', async function () {
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        automationsApi.recordEmailSent.rejects(new Error('recipient persistence failed'));

        await poll(options);

        sinon.assert.calledOnce(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon.assert.calledOnce(automationsApi.recordEmailSent);
        sinon.assert.calledOnceWithExactly(automationsApi.finishStepAndEnqueueNext, step);
        sinon.assert.notCalled(automationsApi.retryStep);
        sinon.assert.notCalled(automationsApi.markStepTerminal);
    });

    it('does not retry the email send when scheduling email analytics fails', async function () {
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        memberWelcomeEmailService.api.sendAutomationEmail.resolves({id: '<mailgun-message-id>'});
        scheduleAutomationEmailAnalyticsJob.rejects(new Error('email analytics scheduling failed'));

        await poll(options);

        sinon.assert.calledOnce(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon.assert.calledOnce(scheduleAutomationEmailAnalyticsJob);
        sinon.assert.calledOnceWithExactly(automationsApi.finishStepAndEnqueueNext, step);
        sinon.assert.notCalled(automationsApi.retryStep);
        sinon.assert.notCalled(automationsApi.markStepTerminal);
    });

    it('enqueues the earlier pending step instead of a later processed next step', async function () {
        const pendingReadyAt = new Date(Date.now() + 30 * 1000);
        const processedNextReadyAt = new Date(Date.now() + 60 * 1000);
        const step = buildWaitStep();
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: pendingReadyAt});
        automationsApi.finishStepAndEnqueueNext.resolves(processedNextReadyAt);

        await poll(options);

        sinon.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, pendingReadyAt);
    });

    it('retries email send failures', async function () {
        const step = buildEmailStep({step_attempts: 1});
        const pollStart = Date.now();
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        memberWelcomeEmailService.api.sendAutomationEmail.rejects(new Error('send failed'));

        await poll(options);

        const retryAt = automationsApi.retryStep.firstCall.args[1];
        assert.ok(Math.abs(retryAt.getTime() - (pollStart + RETRY_DELAY_MS)) < 2000);
        sinon.assert.calledOnceWithExactly(automationsApi.retryStep, step, retryAt);
        sinon.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, retryAt);
    });

    it('permanently fails email send failures at the attempt limit', async function () {
        const step = buildEmailStep({step_attempts: 10});
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        memberWelcomeEmailService.api.sendAutomationEmail.rejects(new Error('send failed'));

        await poll(options);

        sinon.assert.notCalled(automationsApi.retryStep);
        sinon.assert.calledOnceWithExactly(automationsApi.markStepTerminal, step, 'failed');
    });
});
