const should = require('should');
const sinon = require('sinon');
const CollectionRouter = require('../../../../../core/frontend/services/routing/CollectionRouter');
const bootstrap = require('../../../../../core/frontend/services/routing/bootstrap');
const registry = require('../../../../../core/frontend/services/routing/registry');

const RESOURCE_CONFIG = {QUERY: {post: {controller: 'posts', resource: 'posts'}}};

describe('UNIT: services/routing/bootstrap', function () {
    let routesUpdatedStub;
    let routerCreatedSpy;

    beforeEach(function () {
        routerCreatedSpy = sinon.spy();
        routesUpdatedStub = sinon.stub(bootstrap.internal, 'routerUpdated').returns();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('timezone changes', function () {
        describe('no dated permalink', function () {
            it('default', function () {
                const collectionRouter = new CollectionRouter('/magic/', {permalink: '/:slug/'}, RESOURCE_CONFIG, routerCreatedSpy);
                sinon.stub(registry, 'getRouterByName').withArgs('CollectionRouter').returns(collectionRouter);

                bootstrap.handleTimezoneEdit({
                    attributes: {value: 'America/Los_Angeles'},
                    _previousAttributes: {value: 'Europe/London'}
                });

                routesUpdatedStub.called.should.be.false();
            });

            it('tz has not changed', function () {
                const collectionRouter = new CollectionRouter('/magic/', {permalink: '/:slug/'}, RESOURCE_CONFIG, routerCreatedSpy);
                sinon.stub(registry, 'getRouterByName').withArgs('CollectionRouter').returns(collectionRouter);

                bootstrap.handleTimezoneEdit({
                    attributes: {value: 'America/Los_Angeles'},
                    _previousAttributes: {value: 'America/Los_Angeles'}
                });

                routesUpdatedStub.called.should.be.false();
            });
        });

        describe('with dated permalink', function () {
            it('default', function () {
                const collectionRouter = new CollectionRouter('/magic/', {permalink: '/:year/:slug/'}, RESOURCE_CONFIG, routerCreatedSpy);
                sinon.stub(registry, 'getRouterByName').withArgs('CollectionRouter').returns(collectionRouter);

                bootstrap.handleTimezoneEdit({
                    attributes: {value: 'America/Los_Angeles'},
                    _previousAttributes: {value: 'Europe/London'}
                });

                routesUpdatedStub.called.should.be.true();
            });

            it('tz has not changed', function () {
                const collectionRouter = new CollectionRouter('/magic/', {permalink: '/:year/:slug/'}, RESOURCE_CONFIG, routerCreatedSpy);
                sinon.stub(registry, 'getRouterByName').withArgs('CollectionRouter').returns(collectionRouter);

                bootstrap.handleTimezoneEdit({
                    attributes: {value: 'America/Los_Angeles'},
                    _previousAttributes: {value: 'America/Los_Angeles'}
                });

                routesUpdatedStub.called.should.be.false();
            });
        });
    });
});
