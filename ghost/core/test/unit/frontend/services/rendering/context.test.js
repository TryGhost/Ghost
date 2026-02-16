const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
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

            assertExists(res.locals.context);
            assert.deepEqual(res.locals.context, []);
        });

        it('should return empty array with no error with basic parameters', function () {
            renderer.context(req, res, data);

            assertExists(res.locals.context);
            assert.deepEqual(res.locals.context, []);
        });
    });

    describe('index context', function () {
        it('should correctly identify index channel', function () {
            res.locals.relativeUrl = '/does/not/matter/';
            res.routerOptions.context = ['index'];

            renderer.context(req, res, data);

            assertExists(res.locals.context);
            assert(Array.isArray(res.locals.context));
            assert.equal(res.locals.context.length, 1);
            assert.equal(res.locals.context[0], 'index');
        });

        it('should correctly identify / as home', function () {
            res.locals.relativeUrl = '/';
            res.routerOptions.context = ['index'];

            // Execute test
            renderer.context(req, res, data);

            // Check context
            assertExists(res.locals.context);
            assert(Array.isArray(res.locals.context));
            assert.equal(res.locals.context.length, 2);
            assert.equal(res.locals.context[0], 'home');
            assert.equal(res.locals.context[1], 'index');
        });

        it('will not identify / as index without config', function () {
            res.locals.relativeUrl = '/';
            res.routerOptions.context = [];

            // Execute test
            renderer.context(req, res, data);

            // Check context
            assertExists(res.locals.context);
            assert(Array.isArray(res.locals.context));
            assert.equal(res.locals.context.length, 1);
            assert.equal(res.locals.context[0], 'home');
        });

        it('will not identify /page/2/ as index & paged without page param', function () {
            res.locals.relativeUrl = '/page/2/';
            res.routerOptions.context = ['index'];

            renderer.context(req, res, data);

            assertExists(res.locals.context);
            assert(Array.isArray(res.locals.context));
            assert.equal(res.locals.context.length, 1);
            assert.equal(res.locals.context[0], 'index');
        });

        it('should identify /page/2/ as index & paged with page param', function () {
            res.locals.relativeUrl = '/page/2/';
            req.params.page = 2;
            res.routerOptions.context = ['index'];

            renderer.context(req, res, data);

            assertExists(res.locals.context);
            assert(Array.isArray(res.locals.context));
            assert.equal(res.locals.context.length, 2);
            assert.equal(res.locals.context[0], 'paged');
            assert.equal(res.locals.context[1], 'index');
        });
    });

    describe('Tag', function () {
        it('should correctly identify tag channel', function () {
            res.locals.relativeUrl = '/tag/getting-started/';
            res.routerOptions.context = ['tag'];

            renderer.context(req, res, data);

            assertExists(res.locals.context);
            assert(Array.isArray(res.locals.context));
            assert.equal(res.locals.context.length, 1);
            assert.equal(res.locals.context[0], 'tag');
        });

        it('will not identify tag channel url without config', function () {
            res.locals.relativeUrl = '/tag/getting-started/';
            res.routerOptions.context = [];

            renderer.context(req, res, data);

            assertExists(res.locals.context);
            assert.deepEqual(res.locals.context, []);
        });

        it('will not identify /page/2/ as paged without page param', function () {
            res.locals.relativeUrl = '/tag/getting-started/page/2/';
            res.routerOptions.context = ['tag'];

            renderer.context(req, res, data);

            assertExists(res.locals.context);
            assert(Array.isArray(res.locals.context));
            assert.equal(res.locals.context.length, 1);
            assert.equal(res.locals.context[0], 'tag');
        });

        it('should correctly identify /page/2/ as paged with page param', function () {
            res.locals.relativeUrl = '/tag/getting-started/page/2/';
            req.params.page = 2;
            res.routerOptions.context = ['tag'];

            renderer.context(req, res, data);

            assertExists(res.locals.context);
            assert(Array.isArray(res.locals.context));
            assert.equal(res.locals.context.length, 2);
            assert.equal(res.locals.context[0], 'paged');
            assert.equal(res.locals.context[1], 'tag');
        });
    });

    describe('Author', function () {
        it('should correctly identify author channel', function () {
            res.locals.relativeUrl = '/author/pat/';
            res.routerOptions.context = ['author'];

            renderer.context(req, res, data);

            assertExists(res.locals.context);
            assert(Array.isArray(res.locals.context));
            assert.equal(res.locals.context.length, 1);
            assert.equal(res.locals.context[0], 'author');
        });

        it('will not identify author channel url without config', function () {
            res.locals.relativeUrl = '/author/pat/';
            res.routerOptions.context = [];

            renderer.context(req, res, data);

            assertExists(res.locals.context);
            assert.deepEqual(res.locals.context, []);
        });

        it('will not identify /page/2/ as paged without page param', function () {
            res.locals.relativeUrl = '/author/pat/page/2/';
            res.routerOptions.context = ['author'];

            renderer.context(req, res, data);

            assertExists(res.locals.context);
            assert(Array.isArray(res.locals.context));
            assert.equal(res.locals.context.length, 1);
            assert.equal(res.locals.context[0], 'author');
        });

        it('should correctly identify /page/2/ as paged with page param', function () {
            res.locals.relativeUrl = '/author/pat/page/2/';
            req.params.page = 2;
            res.routerOptions.context = ['author'];

            renderer.context(req, res, data);

            assertExists(res.locals.context);
            assert(Array.isArray(res.locals.context));
            assert.equal(res.locals.context.length, 2);
            assert.equal(res.locals.context[0], 'paged');
            assert.equal(res.locals.context[1], 'author');
        });
    });

    describe('Custom', function () {
        it('will use a custom context', function () {
            res.locals.relativeUrl = 'anything';
            res.routerOptions.context = ['custom-context', 'test'];

            renderer.context(req, res, data);

            assertExists(res.locals.context);
            assert(Array.isArray(res.locals.context));
            assert.equal(res.locals.context.length, 2);
            assert.equal(res.locals.context[0], 'custom-context');
            assert.equal(res.locals.context[1], 'test');
        });
    });

    describe('Posts & Pages', function () {
        it('ensure correct context', function () {
            res.locals.relativeUrl = '/welcome-to-ghost/';
            res.routerOptions.context = ['post'];

            renderer.context(req, res, data);

            assertExists(res.locals.context);
            assert(Array.isArray(res.locals.context));
            assert.equal(res.locals.context.length, 1);
            assert.equal(res.locals.context[0], 'post');
        });
    });

    describe('Private', function () {
        it('should correctly identify /private/ as the private route', function () {
            res.locals.relativeUrl = '/private/?r=';
            delete res.routerOptions;

            renderer.context(req, res, data);

            assertExists(res.locals.context);
            assert(Array.isArray(res.locals.context));
            assert.equal(res.locals.context.length, 1);
            assert.equal(res.locals.context[0], 'private');
        });
    });

    describe('Subscribe', function () {
        it('should not identify /subscribe/ as subscribe route if labs flag NOT set', function () {
            res.locals.relativeUrl = '/subscribe/';
            sinon.stub(labs, 'isSet').withArgs('subscribers').returns(false);
            data.post = testUtils.DataGenerator.forKnex.createPost();

            delete res.routerOptions;
            renderer.context(req, res, data);

            assertExists(res.locals.context);
            assert(Array.isArray(res.locals.context));
            assert.equal(res.locals.context.length, 1);
            assert.equal(res.locals.context[0], 'post');
        });
    });
});
