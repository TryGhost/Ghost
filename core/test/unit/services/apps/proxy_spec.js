const should = require('should'),
    sinon = require('sinon'),
    helpers = require('../../../../server/helpers/register'),
    filters = require('../../../../server/filters'),
    AppProxy = require('../../../../server/services/apps/proxy'),
    routing = require('../../../../server/services/routing');

describe('Apps', function () {
    beforeEach(function () {
        sinon.stub(routing.registry, 'getRouter').withArgs('appRouter').returns({
            mountRouter: sinon.stub()
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Proxy', function () {
        it('requires a name to be passed', function () {
            function makeWithoutName() {
                return AppProxy.getInstance();
            }

            makeWithoutName.should.throw('Must provide an app name for api context');
        });

        it('creates a ghost proxy', function () {
            var appProxy = AppProxy.getInstance('TestApp');

            should.exist(appProxy.filters);
            should.exist(appProxy.filters.register);
            should.exist(appProxy.filters.deregister);

            should.exist(appProxy.helpers);
            should.exist(appProxy.helpers.register);
            should.exist(appProxy.helpers.registerAsync);
        });

        it('allows filter registration', function (done) {
            var registerSpy = sinon.spy(filters, 'registerFilter'),
                appProxy = AppProxy.getInstance('TestApp'),
                fakePosts = [{id: 0}, {id: 1}],
                filterStub = sinon.spy(function (val) {
                    return val;
                });

            appProxy.filters.register('testFilter', 5, filterStub);

            registerSpy.called.should.equal(true);

            filterStub.called.should.equal(false);

            filters.doFilter('testFilter', fakePosts)
                .then(function () {
                    filterStub.called.should.equal(true);
                    appProxy.filters.deregister('testFilter', 5, filterStub);
                    done();
                })
                .catch(done);
        });

        it('allows filter deregistration', function (done) {
            var registerSpy = sinon.spy(filters, 'deregisterFilter'),
                appProxy = AppProxy.getInstance('TestApp'),
                fakePosts = [{id: 0}, {id: 1}],
                filterStub = sinon.stub().returns(fakePosts);

            appProxy.filters.deregister('prePostsRender', 5, filterStub);

            registerSpy.called.should.equal(true);

            filterStub.called.should.equal(false);

            filters.doFilter('prePostsRender', fakePosts)
                .then(function () {
                    filterStub.called.should.equal(false);
                    done();
                })
                .catch(done);
        });

        it('allows helper registration', function () {
            var registerSpy = sinon.stub(helpers, 'registerThemeHelper'),
                appProxy = AppProxy.getInstance('TestApp');

            appProxy.helpers.register('myTestHelper', sinon.stub().returns('test result'));

            registerSpy.called.should.equal(true);
        });
    });
});
