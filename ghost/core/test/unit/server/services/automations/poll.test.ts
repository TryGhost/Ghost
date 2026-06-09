import assert from 'node:assert/strict';
import sinon from 'sinon';

import {poll} from '../../../../../core/server/services/automations/poll';
import type {AutomationStepToRun} from '../../../../../core/server/services/automations/automations-repository';
import {MEMBER_WELCOME_EMAIL_SLUGS} from '../../../../../core/server/services/member-welcome-emails/constants';
// @ts-expect-error Models currently lack type definitions.
import {Member} from '../../../../../core/server/models';

const MAX_STEPS_PER_BATCH = 100;
const RETRY_DELAY_MS = 10 * 60 * 1000;

type WaitStep = Extract<AutomationStepToRun, {type: 'wait'}>;
type SendEmailStep = Extract<AutomationStepToRun, {type: 'send_email'}>;
type StepSpecificField =
    | 'type'
    | 'wait_hours'
    | 'email_subject'
    | 'email_lexical'
    | 'email_sender_name'
    | 'email_sender_email'
    | 'email_sender_reply_to'
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
};

const fake = <TFunction extends(..._args: never[]) => unknown>(): StubbedFunction<TFunction> => (
    sinon.stub<Parameters<TFunction>, ReturnType<TFunction>>()
);

function buildMember(attrs: Partial<MemberFixture> = {}) {
    const values = {
        email: 'member@example.com',
        name: 'Test Member',
        status: 'free',
        uuid: '00000000-0000-4000-8000-000000000001',
        ...attrs
    };

    return {
        get(key: keyof MemberFixture): string {
            return values[key];
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
        email_sender_name: null,
        email_sender_email: null,
        email_sender_reply_to: null,
        email_design_setting_id: null,
        ...attrs
    } satisfies SendEmailStep;
}

describe('automations poll', function () {
    let automationsApi: AutomationsApiStubs;
    let memberWelcomeEmailService: MemberWelcomeEmailServiceStubs;
    let options: PollOptionsStubs;

    beforeEach(function () {
        sinon.useFakeTimers({now: new Date('2026-01-01T12:00:00.000Z'), shouldAdvanceTime: true});

        automationsApi = {
            fetchAndLockSteps: fake<AutomationsApi['fetchAndLockSteps']>().resolves({steps: [], nextStepReadyAt: null}),
            finishStepAndEnqueueNext: fake<AutomationsApi['finishStepAndEnqueueNext']>().resolves(null),
            markStepTerminal: fake<AutomationsApi['markStepTerminal']>().resolves(true),
            retryStep: fake<AutomationsApi['retryStep']>().resolves(true)
        };

        memberWelcomeEmailService = {
            init: fake<PollOptions['memberWelcomeEmailService']['init']>(),
            api: {
                loadMemberWelcomeEmails: sinon.stub<[], Promise<void>>().resolves(),
                sendAutomationEmail: fake<PollOptions['memberWelcomeEmailService']['api']['sendAutomationEmail']>().resolves()
            }
        };

        options = {
            automationsApi,
            enqueueAnotherPollAt: fake<PollOptions['enqueueAnotherPollAt']>(),
            memberWelcomeEmailService
        };

        sinon.stub(Member, 'findOne').resolves(buildMember());
    });

    afterEach(function () {
        sinon.restore();
    });

    it('does nothing in production (for now)', async function () {
        // NOTE: We'll remove this test once we go live.
        sinon.stub(process.env, 'NODE_ENV').value('production');

        await poll(options);

        sinon.assert.notCalled(automationsApi.fetchAndLockSteps);
        sinon.assert.notCalled(options.enqueueAnotherPollAt);
        sinon.assert.notCalled(memberWelcomeEmailService.init);
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
        const step = buildEmailStep({
            email_design_setting_id: 'design-id',
            email_sender_email: 'sender@example.com',
            email_sender_name: 'Sender',
            email_sender_reply_to: 'reply@example.com'
        });
        automationsApi.fetchAndLockSteps.resolves({steps: [step], nextStepReadyAt: null});
        automationsApi.finishStepAndEnqueueNext.resolves(nextReadyAt);

        await poll(options);

        sinon.assert.calledOnce(memberWelcomeEmailService.init);
        sinon.assert.calledOnceWithExactly(memberWelcomeEmailService.api.sendAutomationEmail, sinon.match({
            email: {
                designSettingId: 'design-id',
                lexical: step.email_lexical,
                senderEmail: 'sender@example.com',
                senderName: 'Sender',
                senderReplyTo: 'reply@example.com',
                subject: 'Welcome!'
            },
            memberStatus: 'free'
        }));
        sinon.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, nextReadyAt);
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
