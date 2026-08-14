const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const {agentProvider, fixtureManager, configUtils} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const settingsCache = require('../../../core/shared/settings-cache');
const urlService = require('../../../core/server/services/url');
const LazyUrlService = require('../../../core/server/services/url/lazy-url-service');
const {createFindResource} = require('../../../core/server/services/url/lazy-find-resource');
const {UrlServiceFacade} = require('../../../core/server/services/url/url-service-facade');
const urlServiceUtils = require('../../utils/url-service-utils');

// The page must not match the collection filter: the production bug only
// surfaces on sites whose collections are tag-filtered, because a page
// mis-typed 'posts' falls through every filtered collection to /404/.
// On an unfiltered (catch-all) collection the wrong type still lands on
// the same /:slug/ URL and the divergence is invisible.
const TAG_FILTERED_ROUTES = [
    'routes:',
    '',
    'collections:',
    '  /blog/:',
    '    permalink: /blog/{slug}/',
    '    filter: tag:hash-blog',
    '',
    'taxonomies:',
    '  tag: /tag/{slug}/',
    '  author: /author/{slug}/',
    ''
].join('\n');

async function uploadRoutes(adminAgent, routesYaml) {
    const formData = new FormData();
    formData.append('routes', routesYaml, {
        filename: 'routes.yaml',
        contentType: 'application/yaml'
    });
    await adminAgent.post('settings/routes/yaml/')
        .body(formData)
        .expectStatus(200);
    await urlServiceUtils.isFinished();
}

describe('Comments API lazy URL parity', function () {
    let membersAgent;
    let adminAgent;
    let page;
    let originalFacade;
    let loggingErrorSpy;

    beforeAll(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;
        adminAgent = agents.adminAgent;

        await fixtureManager.init('posts', 'members');
        await adminAgent.loginAsOwner();

        // Tee every read through a lazy backend in compare mode, the same
        // shape production runs behind the lazyRouting flag. Swapped before
        // the routes upload so the frontend reload registers the new routers
        // on both backends (bridge reads urlService.facade at reload time).
        originalFacade = urlService.facade;
        urlService.facade = new UrlServiceFacade({
            urlService,
            lazyUrlService: new LazyUrlService({findResource: createFindResource(models)}),
            compare: true
        });

        await uploadRoutes(adminAgent, TAG_FILTERED_ROUTES);

        page = await models.Post.add({
            title: 'Commented Page',
            slug: 'commented-page',
            type: 'page',
            status: 'published'
        }, {context: {internal: true}});

        await models.Comment.add({
            post_id: page.id,
            member_id: fixtureManager.get('members', 0).id,
            html: '<p>A comment on a page</p>',
            status: 'published'
        });
    });

    afterAll(async function () {
        // The DB suites share one process: put back the eager-only facade and
        // the default routes so later suites see the stock configuration.
        const defaultRoutes = fs.readFileSync(
            path.join(configUtils.config.get('paths:appRoot'), 'test/utils/fixtures/settings/routes.yaml'),
            'utf8'
        );
        urlService.facade = originalFacade;
        await uploadRoutes(adminAgent, defaultRoutes);
    });

    beforeEach(function () {
        const getStub = sinon.stub(settingsCache, 'get');
        getStub.callsFake((key, options) => {
            if (key === 'comments_enabled') {
                return 'all';
            }
            return getStub.wrappedMethod.call(settingsCache, key, options);
        });
        loggingErrorSpy = sinon.spy(logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('boots with the shadow comparison active', function () {
        // Guards the facade wiring: without it the no-mismatch assertion
        // below is vacuous.
        assert.equal(urlService.facade.isComparing(), true);
    });

    it('serializes a page comment URL without a lazy parity mismatch', async function () {
        const {body} = await membersAgent
            .get(`/api/comments/post/${page.id}/?include=post`)
            .expectStatus(200);

        assert.equal(body.comments.length, 1);
        const url = body.comments[0].post.url;
        assert.match(url, /\/commented-page\/$/, `expected the page URL, got ${url}`);
        assert.doesNotMatch(url, /\/404\//);

        // The lazy shadow answer is compared on setImmediate; flush before
        // asserting nothing was reported.
        await new Promise((resolve) => {
            setImmediate(resolve);
        });
        await new Promise((resolve) => {
            setImmediate(resolve);
        });

        const parityReports = loggingErrorSpy.getCalls()
            .map(call => call.args[0])
            .filter(err => err && (err.code === 'LAZY_URL_PARITY_MISMATCH' || err.code === 'LAZY_URL_COMPARE_ERROR'));
        assert.deepEqual(
            parityReports.map(err => err.errorDetails),
            [],
            'lazy URL service diverged from eager while serializing a page comment'
        );
    });
});
