import sinon from 'sinon';

import {poll} from '../../../../../core/server/services/automations/poll';

const MAX_STEPS_PER_BATCH = 100;

type PollOptions = Parameters<typeof poll>[0];
type AutomationsApi = PollOptions['automationsApi'];

type StubbedFunction<TFunction extends (..._args: never[]) => unknown> = sinon.SinonStub<Parameters<TFunction>, ReturnType<TFunction>>;

type AutomationsApiStubs = {
    [Method in keyof PollOptions['automationsApi']]: StubbedFunction<PollOptions['automationsApi'][Method]>;
};

type PollOptionsStubs = PollOptions & {
    automationsApi: AutomationsApiStubs;
    enqueueAnotherPollAt: StubbedFunction<PollOptions['enqueueAnotherPollAt']>;
};

const fake = <TFunction extends(..._args: never[]) => unknown>(): StubbedFunction<TFunction> => (
    sinon.stub<Parameters<TFunction>, ReturnType<TFunction>>()
);

describe('automations poll', function () {
    let automationsApi: AutomationsApiStubs;
    let options: PollOptionsStubs;

    beforeEach(function () {
        automationsApi = {
            fetchAndLockSteps: fake<AutomationsApi['fetchAndLockSteps']>().resolves({steps: [], nextStepReadyAt: null})
        };

        options = {
            automationsApi,
            enqueueAnotherPollAt: fake<PollOptions['enqueueAnotherPollAt']>()
        };
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
    });

    it('does nothing when no steps are ready', async function () {
        await poll(options);

        sinon.assert.calledOnceWithExactly(automationsApi.fetchAndLockSteps, MAX_STEPS_PER_BATCH);
        sinon.assert.notCalled(options.enqueueAnotherPollAt);
    });

    it('enqueues the next future poll when no steps are ready', async function () {
        const nextStepReadyAt = new Date(Date.now() + 60 * 1000);
        automationsApi.fetchAndLockSteps.resolves({steps: [], nextStepReadyAt});

        await poll(options);

        sinon.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, nextStepReadyAt);
    });
});
