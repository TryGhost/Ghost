const assert = require('node:assert/strict');
const sinon = require('sinon');
const urlService = require('../../../../../core/server/services/url');
const outputSerializerUrlUtil = require('../../../../../core/server/api/endpoints/utils/serializers/output/utils/url');
const jobsService = require('../../../../../core/server/services/mentions-jobs');
const {getPostData, getPostUrl, makeLoggingJobService} = require('../../../../../core/server/services/mentions/service');

describe('Mentions service post url helpers', function () {
    afterEach(function () {
        sinon.restore();
    });

    function fakePost(relations = {}) {
        return {
            id: 'post-id',
            relations,
            load: sinon.stub().resolves(),
            toJSON: sinon.stub().returns({id: 'post-id', title: 'Post'})
        };
    }

    it('loads the URL service required relations before returning the post data', async function () {
        sinon.stub(urlService, 'getRequiredRelations').returns(['tags', 'authors']);
        const post = fakePost();

        await getPostData(post);

        sinon.assert.calledOnceWithExactly(post.load, ['tags', 'authors']);
    });

    it('getPostUrl resolves a url from a plain resource', function () {
        const forPost = sinon.stub(outputSerializerUrlUtil, 'forPost').callsFake((id, attrs) => {
            attrs.url = `https://site.com/${attrs.slug}/`;
            return attrs;
        });

        const url = getPostUrl('post-id', {slug: 'gone', status: 'published', type: 'post'});

        assert.equal(url, 'https://site.com/gone/');
        assert.equal(forPost.getCall(0).args[0], 'post-id');
        assert.equal(forPost.getCall(0).args[1].status, 'published');
    });

    it('routes a page as a page, not a post', function () {
        // The URL service routes by resource type. A page mis-typed as a post
        // matches no post collection and 404s, so the
        // page's own type must reach forPost.
        const forPost = sinon.stub(outputSerializerUrlUtil, 'forPost');

        getPostUrl('page-id', {slug: 'about', status: 'published', type: 'page'});

        assert.equal(forPost.getCall(0).args[3], 'pages');
    });

    it('routes a post as a post', function () {
        const forPost = sinon.stub(outputSerializerUrlUtil, 'forPost');

        getPostUrl('post-id', {slug: 'hello', status: 'published', type: 'post'});

        assert.equal(forPost.getCall(0).args[3], 'posts');
    });

    it('does not reload relations that are already loaded', async function () {
        sinon.stub(urlService, 'getRequiredRelations').returns(['tags', 'authors']);
        const post = fakePost({tags: {}, authors: {}});

        await getPostData(post);

        sinon.assert.notCalled(post.load);
    });

    it('loads nothing when the routing config reads no relations', async function () {
        sinon.stub(urlService, 'getRequiredRelations').returns([]);
        const post = fakePost();

        await getPostData(post);

        sinon.assert.notCalled(post.load);
    });
});

// Both mentions jobs are queued through this wrapper, so it has to hand the job
// manager the same job it was given: same name, same inline flag, same result,
// same error. The lifecycle logging it adds is deliberately not asserted here:
// that would mean stubbing the shared logger, which is order-dependent under the
// unit project's `isolate: false`.
describe('Mentions service background job wrapper', function () {
    let addJob;

    // Runs the job the wrapper handed to the job service, the way the job
    // manager runs an inline job.
    function runQueuedJob() {
        return addJob.firstCall.args[0].job();
    }

    beforeEach(function () {
        addJob = sinon.stub(jobsService, 'addJob');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('queues the job under its own name without running it', async function () {
        const fn = sinon.stub().resolves();

        await makeLoggingJobService().addJob('processWebmention', fn);

        sinon.assert.calledOnce(addJob);
        assert.equal(addJob.firstCall.args[0].name, 'processWebmention');
        assert.equal(addJob.firstCall.args[0].offloaded, false);
        assert.notEqual(addJob.firstCall.args[0].job, fn, 'the job is wrapped');
        assert.ok(fn.notCalled, 'the job is not run at queue time');
    });

    it('runs the job once and returns its result untouched', async function () {
        const result = {mentions: 1};
        const fn = sinon.stub().resolves(result);

        await makeLoggingJobService().addJob('sendWebmentions', fn);
        const returned = await runQueuedJob();

        sinon.assert.calledOnce(fn);
        assert.equal(returned, result, 'the wrapped result is passed through by reference');
    });

    it('rethrows the original error', async function () {
        const failure = new Error('Job failed');
        const fn = sinon.stub().rejects(failure);

        await makeLoggingJobService().addJob('sendWebmentions', fn);

        await assert.rejects(runQueuedJob(), error => error === failure);
    });
});
