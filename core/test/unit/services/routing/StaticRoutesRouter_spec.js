const should = require('should'),
    sinon = require('sinon'),
    settingsCache = require('../../../../server/services/settings/cache'),
    common = require('../../../../server/lib/common'),
    StaticRoutesRouter = require('../../../../server/services/routing/StaticRoutesRouter'),
    configUtils = require('../../../utils/configUtils'),
    sandbox = sinon.sandbox.create();

describe('UNIT - services/routing/StaticRoutesRouter', function () {
    let req, res, next;

    afterEach(function () {
        configUtils.restore();
    });

    beforeEach(function () {
        sandbox.stub(settingsCache, 'get').withArgs('permalinks').returns('/:slug/');

        sandbox.stub(common.events, 'emit');
        sandbox.stub(common.events, 'on');

        sandbox.spy(StaticRoutesRouter.prototype, 'mountRoute');
        sandbox.spy(StaticRoutesRouter.prototype, 'mountRouter');

        req = sandbox.stub();
        res = sandbox.stub();
        next = sandbox.stub();

        res.locals = {};
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('static routes', function () {
        it('instantiate: default', function () {
            const staticRoutesRouter = new StaticRoutesRouter('/about/', {templates: ['test']});
            should.exist(staticRoutesRouter.router);

            should.not.exist(staticRoutesRouter.getFilter());
            should.not.exist(staticRoutesRouter.getPermalinks());

            staticRoutesRouter.templates.should.eql(['test']);

            common.events.emit.calledOnce.should.be.true();
            common.events.emit.calledWith('router.created', staticRoutesRouter).should.be.true();

            staticRoutesRouter.mountRoute.callCount.should.eql(1);

            // parent route
            staticRoutesRouter.mountRoute.args[0][0].should.eql('/about/');
            staticRoutesRouter.mountRoute.args[0][1].should.eql(staticRoutesRouter._renderStaticRoute.bind(staticRoutesRouter));
        });

        it('fn: _prepareContext', function () {
            const staticRoutesRouter = new StaticRoutesRouter('/about/', {templates: []});

            staticRoutesRouter._prepareContext(req, res, next);
            next.called.should.be.true();
            res._route.should.eql({
                type: 'custom',
                templates: [],
                defaultTemplate: 'index'
            });

            res.locals.routerOptions.should.eql({context: []});
        });
    });
});
