const assert = require('node:assert/strict');
const sinon = require('sinon');
const labs = require('../../../../../core/shared/labs');
const jobsService = require('../../../../../core/server/services/jobs');
const jobsServiceV2 = require('../../../../../core/server/services/jobs/v2').default;
const {registerJobHandlers} = require('../../../../../core/server/services/jobs/v2/register-handlers');
const InMemoryJobsBackend = require('../../../../../core/server/adapters/jobs/InMemoryJobsBackend').default;
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const ExternalMediaInliner = require('../../../../../core/server/services/media-inliner/external-media-inliner');
const MediaInlinerJob = require('../../../../../core/server/services/media-inliner/media-inliner-job');
const mediaInlinerService = require('../../../../../core/server/services/media-inliner');

const DEFAULT_DOMAINS = [
    'https://s3.amazonaws.com/revue',
    'https://substackcdn.com'
];

// Behaviour tests for the media inliner service's job dispatch seam,
// established ahead of its migration to the v2 jobs service so a behaviour
// regression shows up here rather than in production. The legacy suite pins
// the jobsV2-flag-off path; the v2 suite pins the migrated path.
describe('Media Inliner Service', function () {
    let labsIsSet;
    let addJob;
    let inline;

    beforeEach(async function () {
        labsIsSet = sinon.stub(labs, 'isSet').withArgs('jobsV2').returns(false);
        addJob = sinon.stub(jobsService, 'addJob').resolves();
        inline = sinon.stub(ExternalMediaInliner.prototype, 'inline').resolves();
        sinon.stub(adapterManager, 'getAdapter').returns({});

        await mediaInlinerService.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('with the legacy job manager (jobsV2 off)', function () {
        it('enqueues an inline job with the provided domains and reports acceptance', async function () {
            const result = await mediaInlinerService.api.startMediaInliner(['https://example.com']);

            assert.deepEqual(result, {status: 'success'});
            sinon.assert.calledOnce(addJob);
            const jobArg = addJob.firstCall.firstArg;
            assert.equal(jobArg.name, 'external-media-inliner');
            assert.equal(jobArg.offloaded, false);
            assert.deepEqual(jobArg.data, {domains: ['https://example.com']});

            // Acceptance, not completion: the inliner has not run when the call returns
            sinon.assert.notCalled(inline);

            // The enqueued job runs the inliner against the payload domains
            await jobArg.job(jobArg.data);
            sinon.assert.calledOnceWithExactly(inline, ['https://example.com']);
        });

        it('falls back to the default domains when none are provided', async function () {
            await mediaInlinerService.api.startMediaInliner();

            const jobArg = addJob.firstCall.firstArg;
            assert.deepEqual(jobArg.data, {domains: DEFAULT_DOMAINS});
        });

        it('falls back to the default domains when an empty list is provided', async function () {
            await mediaInlinerService.api.startMediaInliner([]);

            const jobArg = addJob.firstCall.firstArg;
            assert.deepEqual(jobArg.data, {domains: DEFAULT_DOMAINS});
        });
    });

    describe('with the v2 jobs service (jobsV2 on)', function () {
        let dispatch;

        beforeEach(function () {
            labsIsSet.returns(true);
            dispatch = sinon.stub(jobsServiceV2, 'dispatch').resolves();
        });

        it('dispatches a MediaInlinerJob with the provided domains and reports acceptance', async function () {
            const result = await mediaInlinerService.api.startMediaInliner(['https://example.com']);

            assert.deepEqual(result, {status: 'success'});
            sinon.assert.notCalled(addJob);
            sinon.assert.calledOnce(dispatch);
            const job = dispatch.firstCall.firstArg;
            assert.ok(job instanceof MediaInlinerJob);
            assert.deepEqual({...job}, {domains: ['https://example.com']});

            // Acceptance, not completion: the inliner has not run when the call returns
            sinon.assert.notCalled(inline);
        });

        it('falls back to the default domains when none are provided', async function () {
            await mediaInlinerService.api.startMediaInliner();

            const job = dispatch.firstCall.firstArg;
            assert.deepEqual({...job}, {domains: DEFAULT_DOMAINS});
        });

        it('falls back to the default domains when an empty list is provided', async function () {
            await mediaInlinerService.api.startMediaInliner([]);

            const job = dispatch.firstCall.firstArg;
            assert.deepEqual({...job}, {domains: DEFAULT_DOMAINS});
        });
    });

    describe('end to end through the v2 jobs service', function () {
        afterEach(async function () {
            await jobsServiceV2.shutdown({timeoutMs: 100});
        });

        it('runs the inliner with a rehydrated payload, never the dispatched object', async function () {
            jobsServiceV2.init({backend: new InMemoryJobsBackend(), errorReporter: sinon.stub()});
            registerJobHandlers();

            const job = new MediaInlinerJob({domains: ['https://example.com']});
            await jobsServiceV2.dispatch(job);

            // Mutating the dispatched object after acceptance must not leak
            // into the delivery — the payload crossed a JSON boundary.
            job.domains.push('https://mutated.example.com');

            await jobsServiceV2.allSettled();

            sinon.assert.calledOnceWithExactly(inline, ['https://example.com']);
        });
    });
});
