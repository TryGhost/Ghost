import sinon from 'sinon';

import {poll} from '../../../../../core/server/services/automations/poll';
import type {AutomationStepToRun} from '../../../../../core/server/services/automations/automations-repository';
import {MEMBER_WELCOME_EMAIL_SLUGS} from '../../../../../core/server/services/member-welcome-emails/constants';
// @ts-expect-error Models currently lack type definitions.
import {Member} from '../../../../../core/server/models';

const MAX_STEPS_PER_BATCH = 100;

type WaitStep = Extract<AutomationStepToRun, {type: 'wait'}>;
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

    it('enqueues the next future poll when no steps are ready', async function () {
        const nextStepReadyAt = new Date(Date.now() + 60 * 1000);
        automationsApi.fetchAndLockSteps.resolves({steps: [], nextStepReadyAt});

        await poll(options);

        sinon.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, nextStepReadyAt);
        sinon.assert.notCalled(memberWelcomeEmailService.init);
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
});
