const should = require('should'),
    sinon = require('sinon'),
    settingsCache = require('../../../../server/services/settings/cache'),
    common = require('../../../../server/lib/common'),
    ParentRouter = require('../../../../server/services/routing/ParentRouter'),
    sandbox = sinon.sandbox.create();

describe('UNIT - services/routing/ParentRouter', function () {
    let req, res, next;

    beforeEach(function () {
        sandbox.stub(settingsCache, 'get').withArgs('permalinks').returns('/:slug/');

        sandbox.stub(common.events, 'emit');
        sandbox.stub(common.events, 'on');

        req = sandbox.stub();
        res = sandbox.stub();
        next = sandbox.stub();

        res.locals = {};
    });

    afterEach(function () {
        sandbox.restore();
    });
    describe('fn: isRedirectEnabled', function () {
        it('no data key defined', function () {
            const parentRouter = new ParentRouter();
            parentRouter.data = undefined;
            parentRouter.isRedirectEnabled('tags', 'bacon').should.be.false();
        });

        it('no data key defined', function () {
            const parentRouter = new ParentRouter();
            parentRouter.data = {query: {}, router: {}};
            should.not.exist(parentRouter.isRedirectEnabled('tags', 'bacon'));
        });

        it('no redirect', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    tags: [{redirect: true}]
                }
            };

            should.not.exist(parentRouter.isRedirectEnabled('tags', 'bacon'));
        });

        it('no redirect', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    tags: [{redirect: true, slug: 'cheese'}]
                }
            };

            should.not.exist(parentRouter.isRedirectEnabled('tags', 'bacon'));
        });

        it('no redirect', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    tags: [{redirect: false, slug: 'bacon'}]
                }
            };

            should.not.exist(parentRouter.isRedirectEnabled('tags', 'bacon'));
        });

        it('redirect', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    tags: [{redirect: true, slug: 'bacon'}]
                }
            };

            should.exist(parentRouter.isRedirectEnabled('tags', 'bacon'));
        });

        it('redirect', function () {
            const parentRouter = new ParentRouter();

            parentRouter.data = {
                query: {},
                router: {
                    pages: [{redirect: true, slug: 'home'}]
                }
            };

            should.exist(parentRouter.isRedirectEnabled('pages', 'home'));
        });
    });
});
