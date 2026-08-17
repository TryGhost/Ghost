const assert = require('node:assert/strict');
const sinon = require('sinon');

const jobsService = require('../../../../../core/server/services/jobs-service');
const registerJobHandlers = require('../../../../../core/server/services/jobs-service/register-job-handlers').default;
const db = require('../../../../../core/server/data/db');
const mediaInlinerService = require('../../../../../core/server/services/media-inliner');
const CleanTokensJob = require('../../../../../core/server/services/members/jobs/clean-tokens-job').default;
const MediaInlinerJob = require('../../../../../core/server/services/media-inliner/media-inliner-job').default;

function flush() {
    return new Promise((resolve) => {
        setTimeout(resolve, 20);
    });
}

describe('register-job-handlers', function () {
    let deleteStub;
    let inlineStub;
    let service;

    beforeEach(async function () {
        deleteStub = sinon.stub().resolves(0);
        const knexFake = sinon.stub().returns({
            where: () => ({delete: deleteStub})
        });
        sinon.stub(db, 'knex').get(() => knexFake);
        inlineStub = sinon.stub(mediaInlinerService, 'inline').resolves();

        service = jobsService.init();
        registerJobHandlers();
        await service.start();
    });

    afterEach(async function () {
        await jobsService.shutdown({timeoutMs: 1000});
        sinon.restore();
    });

    it('wires the clean-tokens handler: dispatching CleanTokensJob runs cleanTokens', async function () {
        await service.dispatch(new CleanTokensJob());
        await flush();

        assert.ok(deleteStub.calledOnce, 'the registered clean-tokens handler ran the deletion task');
    });

    it('wires the media-inliner handler: dispatching MediaInlinerJob runs the inliner with round-tripped domains', async function () {
        const domains = ['https://a.example', 'https://b.example'];

        await service.dispatch(new MediaInlinerJob({domains}));
        await flush();

        assert.ok(inlineStub.calledOnceWithExactly(domains));
    });

    it('schedules clean-tokens recurring: a cron tick runs cleanTokens', async function () {
        const clock = sinon.useFakeTimers({now: Date.UTC(2020, 0, 1)});
        try {
            await service.scheduleRecurring(new CleanTokensJob(), {cron: '*/1 * * * * *'});
            await clock.tickAsync(2000);

            assert.ok(deleteStub.callCount >= 1, 'the recurring schedule fired the clean-tokens handler');
        } finally {
            clock.restore();
        }
    });
});
