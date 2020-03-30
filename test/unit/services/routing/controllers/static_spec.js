const should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../../../utils'),
    api = require('../../../../../core/server/api'),
    themeService = require('../../../../../core/frontend/services/themes'),
    helpers = require('../../../../../core/frontend/services/routing/helpers'),
    controllers = require('../../../../../core/frontend/services/routing/controllers');

function failTest(done) {
    return function (err) {
        should.exist(err);
        done(err);
    };
}

describe('Unit - services/routing/controllers/static', function () {
    let req,
        res,
        secureStub,
        renderStub,
        handleErrorStub,
        formatResponseStub,
        postsPerPage,
        tagsReadStub;

    beforeEach(function () {
        postsPerPage = 5;

        secureStub = sinon.stub();
        renderStub = sinon.stub();
        handleErrorStub = sinon.stub();
        formatResponseStub = sinon.stub();
        formatResponseStub.entries = sinon.stub();

        tagsReadStub = sinon.stub().resolves();
        sinon.stub(api.v2, 'tagsPublic').get(() => {
            return {
                read: tagsReadStub
            };
        });

        sinon.stub(helpers, 'secure').get(function () {
            return secureStub;
        });

        sinon.stub(helpers, 'handleError').get(function () {
            return handleErrorStub;
        });

        sinon.stub(themeService, 'getActive').returns({
            config: function (key) {
                if (key === 'posts_per_page') {
                    return postsPerPage;
                }
            }
        });

        sinon.stub(helpers, 'renderer').get(function () {
            return renderStub;
        });

        sinon.stub(helpers, 'formatResponse').get(function () {
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
            locals: {
                apiVersion: 'v2'
            }
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    it('no extra data to fetch', function (done) {
        helpers.renderer.callsFake(function () {
            helpers.formatResponse.entries.calledOnce.should.be.true();
            tagsReadStub.called.should.be.false();
            helpers.secure.called.should.be.false();
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

        helpers.renderer.callsFake(function () {
            tagsReadStub.called.should.be.true();
            helpers.formatResponse.entries.calledOnce.should.be.true();
            helpers.secure.calledOnce.should.be.true();
            done();
        });

        controllers.static(req, res, failTest(done));
    });
});
