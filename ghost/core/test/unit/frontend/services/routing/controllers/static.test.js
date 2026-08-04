const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../utils/assertions');
const sinon = require('sinon');
const {deferred} = require('../../../../../utils/deferred')

const api = require('../../../../../../core/frontend/services/proxy').api;
const themeEngine = require('../../../../../../core/frontend/services/theme-engine');
const renderer = require('../../../../../../core/frontend/services/rendering');
const controllers = require('../../../../../../core/frontend/services/routing/controllers');

function failTest(done) {
    return function (err) {
        assertExists(err);
        done(err);
    };
}

describe('Unit - services/routing/controllers/static', function () {
    let req;
    let res;
    let renderStub;
    let handleErrorStub;
    let formatResponseStub;
    let postsPerPage;
    let tagsReadStub;

    beforeEach(function () {
        postsPerPage = 5;

        renderStub = sinon.stub();
        handleErrorStub = sinon.stub();
        formatResponseStub = sinon.stub();
        formatResponseStub.entries = sinon.stub();

        tagsReadStub = sinon.stub().resolves();
        sinon.stub(api, 'tagsPublic').get(() => {
            return {
                read: tagsReadStub
            };
        });

        sinon.stub(renderer, 'handleError').get(function () {
            return handleErrorStub;
        });

        sinon.stub(themeEngine, 'getActive').returns({
            config: function (key) {
                if (key === 'posts_per_page') {
                    return postsPerPage;
                }
            }
        });

        sinon.stub(renderer, 'renderer').get(function () {
            return renderStub;
        });

        sinon.stub(renderer, 'formatResponse').get(function () {
            return formatResponseStub;
        });

        req = {
            path: '/',
            params: {},
            route: {}
        };

        res = {
            routerOptions: {},
            render: sinon.spy(),
            redirect: sinon.spy(),
            locals: {}
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    it('no extra data to fetch', function () {
        const {promise, done} = deferred();
        renderer.renderer.callsFake(function () {
            sinon.assert.calledOnce(renderer.formatResponse.entries);
            sinon.assert.notCalled(tagsReadStub);
            done();
        });

        controllers.static(req, res, failTest(done));
        return promise;
    });

    it('extra data to fetch', function () {
        const {promise, done} = deferred();
        res.routerOptions.data = {
            tag: {
                type: 'read',
                resource: 'tags',
                slug: 'bacon'
            }
        };

        tagsReadStub.resolves({tags: [{slug: 'bacon'}]});

        renderer.renderer.callsFake(function () {
            sinon.assert.called(tagsReadStub);
            sinon.assert.calledOnce(renderer.formatResponse.entries);
            done();
        });

        controllers.static(req, res, failTest(done));
        return promise;
    });

    it('resolves the API call from a route data entry', function () {
        const {promise, done} = deferred();
        res.routerOptions.data = {tag: 'tag.bacon'};

        tagsReadStub.resolves({tags: [{slug: 'bacon'}]});

        renderer.renderer.callsFake(function () {
            // `tags` resolves to the tagsPublic controller, and the resource
            // defaults (visibility) are merged in for a read.
            assert.deepEqual(tagsReadStub.firstCall.args[0], {
                slug: 'bacon',
                visibility: 'public',
                context: {member: undefined}
            });
            done();
        });

        controllers.static(req, res, failTest(done));
        return promise;
    });

    it('keys the response data by the name the route gave it', function () {
        const {promise, done} = deferred();
        res.routerOptions.data = {'my-tag': 'tag.bacon'};

        tagsReadStub.resolves({tags: [{slug: 'bacon'}]});

        renderer.renderer.callsFake(function () {
            const response = renderer.formatResponse.entries.firstCall.args[0];

            assert.deepEqual(response.data['my-tag'], [{slug: 'bacon'}]);
            done();
        });

        controllers.static(req, res, failTest(done));
        return promise;
    });

    it('requests relations for a post or page entry', function () {
        const {promise, done} = deferred();
        const pagesReadStub = sinon.stub().resolves({pages: [{slug: 'team'}]});
        sinon.stub(api, 'pagesPublic').get(() => {
            return {read: pagesReadStub};
        });

        res.routerOptions.data = {team: 'page.team'};

        renderer.renderer.callsFake(function () {
            assert.equal(pagesReadStub.firstCall.args[0].include, 'authors,tags,tiers');
            done();
        });

        controllers.static(req, res, failTest(done));
        return promise;
    });

    it('attaches browse meta to the response', function () {
        const {promise, done} = deferred();
        const postsBrowseStub = sinon.stub().resolves({posts: [{slug: 'welcome'}], meta: {pagination: {}}});
        sinon.stub(api, 'postsPublic').get(() => {
            return {browse: postsBrowseStub};
        });

        res.routerOptions.data = {
            featured: {type: 'browse', resource: 'posts', filter: 'featured:true', limit: 3}
        };

        renderer.renderer.callsFake(function () {
            assert.equal(postsBrowseStub.firstCall.args[0].filter, 'featured:true');
            assert.equal(postsBrowseStub.firstCall.args[0].limit, 3);

            const response = renderer.formatResponse.entries.firstCall.args[0];
            assert.deepEqual(response.data.featured.meta, {pagination: {}});
            done();
        });

        controllers.static(req, res, failTest(done));
        return promise;
    });
});
