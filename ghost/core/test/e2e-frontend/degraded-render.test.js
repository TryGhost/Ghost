const assert = require('node:assert/strict');
const sinon = require('sinon');
const supertest = require('supertest');

const testUtils = require('../utils');
const config = require('../../core/shared/config');
const configUtils = require('../utils/config-utils');
const postsPublicApi = require('../../core/server/api/endpoints/posts-public');

/**
 * The source test theme's post.hbs contains a {{#get "posts"}} block. When that
 * call exceeds optimization:getHelper:timeout:threshold it aborts, renders
 * fallback content and flags the response via res.locals.degradedRender (the
 * helper's options.data.root._locals IS res.locals — express merges res.locals
 * into the render options), which the renderer turns into caching headers.
 */
describe('Degraded render caching', function () {
    let request;

    beforeAll(async function () {
        await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    it('marks the response and caps Cache-Control when {{#get}} aborts', async function () {
        configUtils.set('optimization:getHelper:timeout:threshold', 1);
        configUtils.set('caching:frontend:maxAge', 600);

        // Delay the posts browse query (used by {{#get}} in post.hbs) past the
        // threshold so the helper aborts; the post itself loads via read()
        const originalQuery = postsPublicApi.browse.query;
        sinon.stub(postsPublicApi.browse, 'query').callsFake(async function (frame) {
            await new Promise((resolve) => {
                setTimeout(resolve, 200);
            });
            return originalQuery.call(this, frame);
        });

        const res = await request.get('/welcome/')
            .expect('Content-Type', /html/)
            .expect(200);

        assert(res.text.includes('data-aborted-get-helper'));
        assert.equal(res.headers['x-ghost-degraded-render'], 'aborted-get-helper');
        assert.equal(res.headers['cache-control'], 'public, max-age=60');
    });

    it('leaves healthy renders and their Cache-Control untouched', async function () {
        configUtils.set('optimization:getHelper:timeout:threshold', 5000);
        configUtils.set('caching:frontend:maxAge', 600);

        const res = await request.get('/welcome/')
            .expect('Content-Type', /html/)
            .expect(200);

        assert(!res.text.includes('data-aborted-get-helper'));
        assert.equal(res.headers['x-ghost-degraded-render'], undefined);
        assert.equal(res.headers['cache-control'], 'public, max-age=600');
    });
});
