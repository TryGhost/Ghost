const should = require('should');
const sinon = require('sinon');
const _ = require('lodash');
const testUtils = require('../../utils');
const adminUtils = require('../../utils/admin-utils');
const mockUtils = require('../../utils/mocks');
const configUtils = require('../../utils/configUtils');
const urlUtils = require('../../utils/urlUtils');
const appService = require('../../../core/frontend/services/apps');
const themeEngine = require('../../../core/frontend/services/theme-engine');
const siteApp = require('../../../core/server/web/parent/app');

describe('Integration - Web - vhosts', function () {
    let app;

    before(testUtils.integrationTesting.urlService.resetGenerators);
    before(testUtils.teardownDb);
    before(testUtils.setup('users:roles', 'posts'));
    before(adminUtils.stubClientFiles);

    after(function () {
        configUtils.restore();
        urlUtils.restore();
        sinon.restore();
    });

    describe('no separate admin', function () {
        before(function () {
            testUtils.integrationTesting.urlService.resetGenerators();
            testUtils.integrationTesting.defaultMocks(sinon, {amp: true});
            testUtils.integrationTesting.overrideGhostConfig(configUtils);

            configUtils.set('url', 'http://example.com');
            configUtils.set('admin:url', null);

            return testUtils.integrationTesting.initGhost()
                .then(function () {
                    sinon.stub(themeEngine.getActive(), 'engine').withArgs('ghost-api').returns('v2');
                    sinon.stub(themeEngine.getActive(), 'config').withArgs('posts_per_page').returns(2);

                    app = siteApp({start: true});
                    return testUtils.integrationTesting.urlServiceInitAndWait();
                })
                .then(() => {
                    return appService.init();
                });
        });

        before(function () {
            configUtils.set('url', 'http://example.com');
            configUtils.set('admin:url', null);
            urlUtils.stubUrlUtilsFromConfig();
        });

        after(function () {
            configUtils.restore();
            urlUtils.restore();
            sinon.restore();
        });

        it('loads the front-end on configured url', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/',
                host: 'example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('loads the front-end on localhost', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/',
                host: 'localhost'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('loads the admin', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/ghost/',
                host: 'example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('loads the admin on localhost', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/ghost/',
                host: 'localhost'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('loads the api', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/ghost/api/v2/admin/site/',
                host: 'example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('loads the api on localhost', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/ghost/api/v2/admin/site/',
                host: 'localhost'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });
    });

    describe('separate admin host', function () {
        before(function () {
            testUtils.integrationTesting.urlService.resetGenerators();
            testUtils.integrationTesting.defaultMocks(sinon, {amp: true});
            testUtils.integrationTesting.overrideGhostConfig(configUtils);

            configUtils.set('url', 'http://example.com');
            configUtils.set('admin:url', 'https://admin.example.com');

            return testUtils.integrationTesting.initGhost()
                .then(function () {
                    sinon.stub(themeEngine.getActive(), 'engine').withArgs('ghost-api').returns('v2');
                    sinon.stub(themeEngine.getActive(), 'config').withArgs('posts_per_page').returns(2);

                    app = siteApp({start: true});
                    return testUtils.integrationTesting.urlServiceInitAndWait();
                })
                .then(() => {
                    return appService.init();
                });
        });

        before(function () {
            urlUtils.stubUrlUtilsFromConfig();
        });

        after(function () {
            configUtils.restore();
            urlUtils.restore();
            sinon.restore();
        });

        it('loads the front-end on configured url', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/',
                host: 'example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('loads the front-end on localhost', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/',
                host: 'localhost'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('redirects /ghost/ on configured url', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/ghost/',
                host: 'example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(301);
                    response.headers.location.should.eql('https://admin.example.com/ghost/');
                });
        });

        it('404s the api on configured url', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/ghost/api/v2/admin/site/',
                host: 'example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(404);
                });
        });

        it('404s the api on localhost', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/ghost/api/v2/admin/site/',
                host: 'localhost'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(404);
                });
        });

        it('loads the admin on configured admin url', function () {
            const req = {
                secure: true,
                method: 'GET',
                url: '/ghost/',
                host: 'admin.example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('loads the api on configured admin url', function () {
            const req = {
                secure: true,
                method: 'GET',
                url: '/ghost/api/v2/admin/site/',
                host: 'admin.example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('redirects to the correct protocol on configured admin url', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/ghost/',
                host: 'admin.example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(301);
                    response.headers.location.should.eql('https://admin.example.com/ghost/');
                });
        });

        it('404s the front-end on configured admin url', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/',
                host: 'admin.example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(404);
                });
        });
    });

    describe('separate admin host w/ admin redirects disabled', function () {
        before(function () {
            testUtils.integrationTesting.urlService.resetGenerators();
            testUtils.integrationTesting.defaultMocks(sinon, {amp: true});
            testUtils.integrationTesting.overrideGhostConfig(configUtils);

            configUtils.set('url', 'http://example.com');
            configUtils.set('admin:url', 'https://admin.example.com');
            configUtils.set('admin:redirects', false);

            return testUtils.integrationTesting.initGhost()
                .then(function () {
                    sinon.stub(themeEngine.getActive(), 'engine').withArgs('ghost-api').returns('v2');
                    sinon.stub(themeEngine.getActive(), 'config').withArgs('posts_per_page').returns(2);

                    app = siteApp({start: true});
                    return testUtils.integrationTesting.urlServiceInitAndWait();
                })
                .then(() => {
                    return appService.init();
                });
        });

        before(function () {
            urlUtils.stubUrlUtilsFromConfig();
        });

        after(function () {
            configUtils.restore();
            urlUtils.restore();
            sinon.restore();
        });

        it('does not redirect /ghost/ on configured url', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/ghost/',
                host: 'example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(404);
                });
        });
    });

    describe('same host separate protocol', function () {
        before(function () {
            testUtils.integrationTesting.urlService.resetGenerators();
            testUtils.integrationTesting.defaultMocks(sinon, {amp: true});
            testUtils.integrationTesting.overrideGhostConfig(configUtils);

            configUtils.set('url', 'http://example.com');
            configUtils.set('admin:url', 'https://example.com');

            return testUtils.integrationTesting.initGhost()
                .then(function () {
                    sinon.stub(themeEngine.getActive(), 'engine').withArgs('ghost-api').returns('v2');
                    sinon.stub(themeEngine.getActive(), 'config').withArgs('posts_per_page').returns(2);

                    app = siteApp({start: true});
                    return testUtils.integrationTesting.urlServiceInitAndWait();
                })
                .then(() => {
                    return appService.init();
                });
        });

        before(function () {
            urlUtils.stubUrlUtilsFromConfig();
        });

        it('loads the front-end on configured url (http)', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/',
                host: 'example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('404s the front-end on configured url (https)', function () {
            const req = {
                secure: true,
                method: 'GET',
                url: '/',
                host: 'example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('loads the front-end on localhost', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/',
                host: 'localhost'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('redirects /ghost/ on configured url', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/ghost/',
                host: 'example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(301);
                    response.headers.location.should.eql('https://example.com/ghost/');
                });
        });

        it('redirects /ghost/ on localhost', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/ghost/',
                host: 'localhost'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(301);
                    response.headers.location.should.eql('https://example.com/ghost/');
                });
        });

        it('redirects api to correct protocol on configured admin url', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/ghost/api/v2/admin/site/',
                host: 'example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(301);
                    response.headers.location.should.eql('https://example.com/ghost/api/v2/admin/site/');
                });
        });

        it('loads the admin on configured admin url', function () {
            const req = {
                secure: true,
                method: 'GET',
                url: '/ghost/',
                host: 'example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('redirects the admin on localhost', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/ghost/',
                host: 'localhost'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(301);
                    response.headers.location.should.eql('https://example.com/ghost/');
                });
        });

        it('loads the api on configured admin url', function () {
            const req = {
                secure: true,
                method: 'GET',
                url: '/ghost/api/v2/admin/site/',
                host: 'example.com'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('redirects the api on localhost', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/ghost/api/v2/admin/site/',
                host: 'localhost'
            };

            return mockUtils.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(301);
                    response.headers.location.should.eql('https://example.com/ghost/api/v2/admin/site/');
                });
        });
    });
});
