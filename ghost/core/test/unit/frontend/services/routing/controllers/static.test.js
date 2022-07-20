const should = require('should');
const sinon = require('sinon');

const api = require('../../../../../../core/frontend/services/proxy').api;
const themeEngine = require('../../../../../../core/frontend/services/theme-engine');
const renderer = require('../../../../../../core/frontend/services/rendering');
const controllers = require('../../../../../../core/frontend/services/routing/controllers');

function failTest(done) {
    return function (err) {
        should.exist(err);
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

    it('no extra data to fetch', function (done) {
        renderer.renderer.callsFake(function () {
            renderer.formatResponse.entries.calledOnce.should.be.true();
            tagsReadStub.called.should.be.false();
            done();
        });

        controllers.static(req, res, failTest(done));
    });

    it('extra data to fetch', function (done) {
        res.routerOptions.data = {
            tag: {
                controller: 'tagsPublic',
                resource: 'tags',
                type: 'read',
                options: {
                    slug: 'bacon'
                }
            }
        };

        tagsReadStub = sinon.stub().resolves({tags: [{slug: 'bacon'}]});

        renderer.renderer.callsFake(function () {
            tagsReadStub.called.should.be.true();
            renderer.formatResponse.entries.calledOnce.should.be.true();
            done();
        });

        controllers.static(req, res, failTest(done));
    });
});
