const should = require('should');
const sinon = require('sinon');
const CollectionRouter = require('../../../../../core/frontend/services/routing/CollectionRouter');
const RouterManager = require('../../../../../core/frontend/services/routing/RouterManager');
const registry = require('../../../../../core/frontend/services/routing/registry');

const RESOURCE_CONFIG = {QUERY: {post: {controller: 'posts', resource: 'posts'}}};

describe('UNIT: services/routing/router-manager', function () {
    let routerUpdatedSpy;
    let routerCreatedSpy;

    beforeEach(function () {
        routerCreatedSpy = sinon.spy();
        routerUpdatedSpy = sinon.spy();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('timezone changes', function () {
        describe('no dated permalink', function () {
            it('default', function () {
                const collectionRouter = new CollectionRouter('/magic/', {permalink: '/:slug/'}, RESOURCE_CONFIG, routerCreatedSpy);
                sinon.stub(registry, 'getRouterByName').withArgs('CollectionRouter').returns(collectionRouter);

                const routerManager = new RouterManager({registry});
                routerManager.init({
                    urlService: {
                        onRouterUpdated: routerUpdatedSpy
                    }
                });

                routerManager.handleTimezoneEdit({
                    attributes: {value: 'America/Los_Angeles'},
                    _previousAttributes: {value: 'Europe/London'}
                });

                routerUpdatedSpy.called.should.be.false();
            });

            it('tz has not changed', function () {
                const collectionRouter = new CollectionRouter('/magic/', {permalink: '/:slug/'}, RESOURCE_CONFIG, routerCreatedSpy);
                sinon.stub(registry, 'getRouterByName').withArgs('CollectionRouter').returns(collectionRouter);

                const routerManager = new RouterManager({registry});
                routerManager.init({
                    urlService: {
                        onRouterUpdated: routerUpdatedSpy
                    }
                });

                routerManager.handleTimezoneEdit({
                    attributes: {value: 'America/Los_Angeles'},
                    _previousAttributes: {value: 'America/Los_Angeles'}
                });

                routerUpdatedSpy.called.should.be.false();
            });
        });

        describe('with dated permalink', function () {
            it('default', function () {
                const collectionRouter = new CollectionRouter('/magic/', {permalink: '/:year/:slug/'}, RESOURCE_CONFIG, routerCreatedSpy);
                sinon.stub(registry, 'getRouterByName').withArgs('CollectionRouter').returns(collectionRouter);

                const routerManager = new RouterManager({registry});
                routerManager.init({
                    urlService: {
                        onRouterUpdated: routerUpdatedSpy
                    }
                });

                routerManager.handleTimezoneEdit({
                    attributes: {value: 'America/Los_Angeles'},
                    _previousAttributes: {value: 'Europe/London'}
                });

                routerUpdatedSpy.called.should.be.true();
            });

            it('tz has not changed', function () {
                const collectionRouter = new CollectionRouter('/magic/', {permalink: '/:year/:slug/'}, RESOURCE_CONFIG, routerCreatedSpy);
                sinon.stub(registry, 'getRouterByName').withArgs('CollectionRouter').returns(collectionRouter);

                const routerManager = new RouterManager({registry});
                routerManager.init({
                    urlService: {
                        onRouterUpdated: routerUpdatedSpy
                    }
                });

                routerManager.handleTimezoneEdit({
                    attributes: {value: 'America/Los_Angeles'},
                    _previousAttributes: {value: 'America/Los_Angeles'}
                });

                routerUpdatedSpy.called.should.be.false();
            });
        });
    });
});
