const should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../../../utils'),
    api = require('../../../../../server/api'),
    themeService = require('../../../../../server/services/themes'),
    helpers = require('../../../../../server/services/routing/helpers'),
    controllers = require('../../../../../server/services/routing/controllers'),
    sandbox = sinon.sandbox.create();

function failTest(done) {
    return function (err) {
        should.exist(err);
        done(err);
    };
}

describe('Unit - services/routing/controllers/static', function () {
    let req, res, secureStub, renderStub, handleErrorStub, formatResponseStub, posts, postsPerPage;

    beforeEach(function () {
        postsPerPage = 5;

        posts = [
            testUtils.DataGenerator.forKnex.createPost()
        ];

        secureStub = sandbox.stub();
        renderStub = sandbox.stub();
        handleErrorStub = sandbox.stub();
        formatResponseStub = sandbox.stub();
        formatResponseStub.entries = sandbox.stub();

        sandbox.stub(api.tags, 'read');

        sandbox.stub(helpers, 'secure').get(function () {
            return secureStub;
        });

        sandbox.stub(helpers, 'handleError').get(function () {
            return handleErrorStub;
        });

        sandbox.stub(themeService, 'getActive').returns({
            config: function (key) {
               key.should.eql('posts_per_page');
               return postsPerPage;
           }
        });

        sandbox.stub(helpers, 'renderer').get(function () {
            return renderStub;
        });

        sandbox.stub(helpers, 'formatResponse').get(function () {
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
            redirect: sinon.spy()
        };
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('no extra data to fetch', function (done) {
        helpers.renderer.callsFake(function () {
            helpers.formatResponse.entries.withArgs({}).calledOnce.should.be.true();
            api.tags.read.called.should.be.false();
            helpers.secure.called.should.be.false();
            done();
        });

        controllers.static(req, res, failTest(done));
    });

    it('extra data to fetch', function (done) {
        res.routerOptions.data = {
            tag: {
                resource: 'tags',
                type: 'read',
                options: {
                    slug: 'bacon'
                }
            }
        };

        api.tags.read.withArgs({slug: 'bacon'}).resolves({tags: [{slug: 'bacon'}]});

        helpers.renderer.callsFake(function () {
            api.tags.read.withArgs({slug: 'bacon'}).called.should.be.true();
            helpers.formatResponse.entries.withArgs({data: {tag: [{slug: 'bacon'}]}}).calledOnce.should.be.true();
            helpers.secure.calledOnce.should.be.true();
            done();
        });

        controllers.static(req, res, failTest(done));
    });
});
