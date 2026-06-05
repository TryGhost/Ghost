import sinon from 'sinon';

import {poll} from '../../../../../core/server/services/automations/poll';
// @ts-expect-error Models currently lack type definitions.
import {Member} from '../../../../../core/server/models';

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
});
