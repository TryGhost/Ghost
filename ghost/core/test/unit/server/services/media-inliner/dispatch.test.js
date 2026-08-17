const assert = require('node:assert/strict');
const sinon = require('sinon');

const mediaInlinerService = require('../../../../../core/server/services/media-inliner');
const ExternalMediaInliner = require('../../../../../core/server/services/media-inliner/external-media-inliner');
const jobsService = require('../../../../../core/server/services/jobs-service');
const registerJobHandlers = require('../../../../../core/server/services/jobs-service/register-job-handlers').default;
const db = require('../../../../../core/server/data/db');

function flush() {
    return new Promise((resolve) => {
        setTimeout(resolve, 20);
    });
}

describe('media-inliner dispatch', function () {
    let inlineStub;

    beforeAll(async function () {
        inlineStub = sinon.stub(ExternalMediaInliner.prototype, 'inline').resolves();

        await mediaInlinerService.init();

        sinon.stub(db, 'knex').get(() => sinon.stub().returns({where: () => ({delete: sinon.stub().resolves(0)})}));

        const service = jobsService.init();
        registerJobHandlers();
        await service.start();
    });

    afterAll(async function () {
        await jobsService.shutdown({timeoutMs: 1000});
        sinon.restore();
    });

    afterEach(function () {
        inlineStub.resetHistory();
    });

    it('runs the inliner with the provided domains', async function () {
        const domains = ['https://s3.amazonaws.com/revue', 'https://substackcdn.com'];

        const result = await mediaInlinerService.api.startMediaInliner(domains);
        assert.equal(result.status, 'success');

        await flush();

        assert.ok(inlineStub.calledOnceWithExactly(domains));
    });

    it('defaults the domains when none are provided', async function () {
        await mediaInlinerService.api.startMediaInliner();

        await flush();

        const [calledDomains] = inlineStub.firstCall.args;
        assert.deepEqual(calledDomains, [
            'https://s3.amazonaws.com/revue',
            'https://substackcdn.com'
        ]);
    });
});
