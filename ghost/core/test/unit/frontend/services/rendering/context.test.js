const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../utils');
const renderer = require('../../../../../core/frontend/services/rendering');
const labs = require('../../../../../core/shared/labs');

describe('Contexts', function () {
    let req;
    let res;
    let data;

    beforeEach(function () {
        req = {
            params: {},
            body: {}
        };
        res = {
            locals: {},
            routerOptions: {}
        };
        data = {};
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Unknown', function () {
        it('should return empty array with no error if all parameters are empty', function () {
            // Reset all parameters to empty
            req = {};
            res = {};
            data = {};

            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(0);
        });

        it('should return empty array with no error with basic parameters', function () {
            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(0);
        });
    });

    describe('index context', function () {
        it('should correctly identify index channel', function () {
            res.locals.relativeUrl = '/does/not/matter/';
            res.routerOptions.context = ['index'];

            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('index');
        });

        it('should correctly identify / as home', function () {
            res.locals.relativeUrl = '/';
            res.routerOptions.context = ['index'];

            // Execute test
            renderer.context(req, res, data);

            // Check context
            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(2);
            res.locals.context[0].should.eql('home');
            res.locals.context[1].should.eql('index');
        });

        it('will not identify / as index without config', function () {
            res.locals.relativeUrl = '/';
            res.routerOptions.context = [];

            // Execute test
            renderer.context(req, res, data);

            // Check context
            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('home');
        });

        it('will not identify /page/2/ as index & paged without page param', function () {
            res.locals.relativeUrl = '/page/2/';
            res.routerOptions.context = ['index'];

            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('index');
        });

        it('should identify /page/2/ as index & paged with page param', function () {
            res.locals.relativeUrl = '/page/2/';
            req.params.page = 2;
            res.routerOptions.context = ['index'];

            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(2);
            res.locals.context[0].should.eql('paged');
            res.locals.context[1].should.eql('index');
        });
    });

    describe('Tag', function () {
        it('should correctly identify tag channel', function () {
            res.locals.relativeUrl = '/tag/getting-started/';
            res.routerOptions.context = ['tag'];

            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('tag');
        });

        it('will not identify tag channel url without config', function () {
            res.locals.relativeUrl = '/tag/getting-started/';
            res.routerOptions.context = [];

            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(0);
        });

        it('will not identify /page/2/ as paged without page param', function () {
            res.locals.relativeUrl = '/tag/getting-started/page/2/';
            res.routerOptions.context = ['tag'];

            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('tag');
        });

        it('should correctly identify /page/2/ as paged with page param', function () {
            res.locals.relativeUrl = '/tag/getting-started/page/2/';
            req.params.page = 2;
            res.routerOptions.context = ['tag'];

            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(2);
            res.locals.context[0].should.eql('paged');
            res.locals.context[1].should.eql('tag');
        });
    });

    describe('Author', function () {
        it('should correctly identify author channel', function () {
            res.locals.relativeUrl = '/author/pat/';
            res.routerOptions.context = ['author'];

            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('author');
        });

        it('will not identify author channel url without config', function () {
            res.locals.relativeUrl = '/author/pat/';
            res.routerOptions.context = [];

            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(0);
        });

        it('will not identify /page/2/ as paged without page param', function () {
            res.locals.relativeUrl = '/author/pat/page/2/';
            res.routerOptions.context = ['author'];

            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('author');
        });

        it('should correctly identify /page/2/ as paged with page param', function () {
            res.locals.relativeUrl = '/author/pat/page/2/';
            req.params.page = 2;
            res.routerOptions.context = ['author'];

            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(2);
            res.locals.context[0].should.eql('paged');
            res.locals.context[1].should.eql('author');
        });
    });

    describe('Custom', function () {
        it('will use a custom context', function () {
            res.locals.relativeUrl = 'anything';
            res.routerOptions.context = ['custom-context', 'test'];

            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(2);
            res.locals.context[0].should.eql('custom-context');
            res.locals.context[1].should.eql('test');
        });
    });

    describe('Posts & Pages', function () {
        it('ensure correct context', function () {
            res.locals.relativeUrl = '/welcome-to-ghost/';
            res.routerOptions.context = ['post'];

            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('post');
        });
    });

    describe('Private', function () {
        it('should correctly identify /private/ as the private route', function () {
            res.locals.relativeUrl = '/private/?r=';
            delete res.routerOptions;

            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('private');
        });
    });

    describe('Subscribe', function () {
        it('should not identify /subscribe/ as subscribe route if labs flag NOT set', function () {
            res.locals.relativeUrl = '/subscribe/';
            sinon.stub(labs, 'isSet').withArgs('subscribers').returns(false);
            data.post = testUtils.DataGenerator.forKnex.createPost();

            delete res.routerOptions;
            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(1);
            res.locals.context[0].should.eql('post');
        });
    });

    describe('AMP', function () {
        it('should correctly identify AMP post', function () {
            res.locals.relativeUrl = '/welcome-to-ghost/amp/';
            data.post = testUtils.DataGenerator.forKnex.createPost();

            delete res.routerOptions;
            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(2);
            res.locals.context[0].should.eql('amp');
            res.locals.context[1].should.eql('post');
        });

        it('should correctly identify AMP page', function () {
            res.locals.relativeUrl = '/welcome-to-ghost/amp/';
            data.page = testUtils.DataGenerator.forKnex.createPost({page: true});

            delete res.routerOptions;
            renderer.context(req, res, data);

            should.exist(res.locals.context);
            res.locals.context.should.be.an.Array().with.lengthOf(2);
            res.locals.context[0].should.eql('amp');
            res.locals.context[1].should.eql('page');
        });
    });
});
