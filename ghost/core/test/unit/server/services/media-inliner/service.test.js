const assert = require('node:assert/strict');
const sinon = require('sinon');
const jobsService = require('../../../../../core/server/services/jobs');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const ExternalMediaInliner = require('../../../../../core/server/services/media-inliner/external-media-inliner');
const mediaInlinerService = require('../../../../../core/server/services/media-inliner');

const DEFAULT_DOMAINS = [
    'https://s3.amazonaws.com/revue',
    'https://substackcdn.com'
];

// Behaviour tests for the media inliner service's job dispatch seam,
// established ahead of its migration to the v2 jobs service so a behaviour
// regression shows up here rather than in production.
describe('Media Inliner Service', function () {
    let addJob;
    let inline;

    beforeEach(async function () {
        addJob = sinon.stub(jobsService, 'addJob').resolves();
        inline = sinon.stub(ExternalMediaInliner.prototype, 'inline').resolves();
        sinon.stub(adapterManager, 'getAdapter').returns({});

        await mediaInlinerService.init();
    });

    afterEach(function () {
        sinon.restore();
    });

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
