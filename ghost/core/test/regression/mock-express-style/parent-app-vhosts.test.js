const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const configUtils = require('../../utils/configUtils');
const urlUtils = require('../../utils/urlUtils');
const themeEngine = require('../../../core/frontend/services/theme-engine');

describe('Integration - Web - vhosts', function () {
    let app;

    const ADMIN_API_URL = '/ghost/api/admin';

    before(testUtils.teardownDb);

    after(function () {
        configUtils.restore();
        urlUtils.restore();
        sinon.restore();
    });

    describe('no separate admin', function () {
        before(async function () {
            localUtils.defaultMocks(sinon, {amp: true});
            localUtils.overrideGhostConfig(configUtils);

            configUtils.set('url', 'http://example.com');
            configUtils.set('admin:url', null);

            app = await localUtils.initGhost({backend: true});
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

            return localUtils.mockExpress.invoke(app, req)
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

            return localUtils.mockExpress.invoke(app, req)
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

            return localUtils.mockExpress.invoke(app, req)
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

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('loads the api', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: `${ADMIN_API_URL}/site/`,
                host: 'example.com'
            };

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('loads the api on localhost', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: `${ADMIN_API_URL}/site/`,
                host: 'localhost'
            };

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });
    });

    describe('separate admin host', function () {
        before(async function () {
            localUtils.defaultMocks(sinon, {amp: true});
            localUtils.overrideGhostConfig(configUtils);

            configUtils.set('url', 'http://example.com');
            configUtils.set('admin:url', 'https://admin.example.com');

            app = await localUtils.initGhost({backend: true});

            sinon.stub(themeEngine.getActive(), 'config').withArgs('posts_per_page').returns(2);
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

            return localUtils.mockExpress.invoke(app, req)
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

            return localUtils.mockExpress.invoke(app, req)
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

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(301);
                    response.headers.location.should.eql('https://admin.example.com/ghost/');
                });
        });

        it('404s the api on configured url', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: `${ADMIN_API_URL}/site/`,
                host: 'example.com'
            };

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(404);
                });
        });

        it('404s the api on localhost', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: `${ADMIN_API_URL}/site/`,
                host: 'localhost'
            };

            return localUtils.mockExpress.invoke(app, req)
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

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('loads the api on configured admin url', function () {
            const req = {
                secure: true,
                method: 'GET',
                url: `${ADMIN_API_URL}/site/`,
                host: 'admin.example.com'
            };

            return localUtils.mockExpress.invoke(app, req)
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

            return localUtils.mockExpress.invoke(app, req)
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

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(404);
                });
        });
    });

    describe('separate admin host w/ admin redirects disabled', function () {
        before(async function () {
            localUtils.defaultMocks(sinon, {amp: true});
            localUtils.overrideGhostConfig(configUtils);

            configUtils.set('url', 'http://example.com');
            configUtils.set('admin:url', 'https://admin.example.com');
            configUtils.set('admin:redirects', false);

            sinon.stub(themeEngine.getActive(), 'config').withArgs('posts_per_page').returns(2);

            app = await localUtils.initGhost({backend: true});
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

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(404);
                });
        });
    });

    describe('same host separate protocol', function () {
        before(async function () {
            localUtils.urlService.resetGenerators();
            localUtils.defaultMocks(sinon, {amp: true});
            localUtils.overrideGhostConfig(configUtils);

            configUtils.set('url', 'http://example.com');
            configUtils.set('admin:url', 'https://example.com');

            sinon.stub(themeEngine.getActive(), 'config').withArgs('posts_per_page').returns(2);

            app = await localUtils.initGhost({backend: true});
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

            return localUtils.mockExpress.invoke(app, req)
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

            return localUtils.mockExpress.invoke(app, req)
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

            return localUtils.mockExpress.invoke(app, req)
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

            return localUtils.mockExpress.invoke(app, req)
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

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(301);
                    response.headers.location.should.eql('https://example.com/ghost/');
                });
        });

        it('redirects api to correct protocol on configured admin url', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: `${ADMIN_API_URL}/site/`,
                host: 'example.com'
            };

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(301);
                    response.headers.location.should.eql(`https://example.com${ADMIN_API_URL}/site/`);
                });
        });

        it('loads the admin on configured admin url', function () {
            const req = {
                secure: true,
                method: 'GET',
                url: '/ghost/',
                host: 'example.com'
            };

            return localUtils.mockExpress.invoke(app, req)
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

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(301);
                    response.headers.location.should.eql('https://example.com/ghost/');
                });
        });

        it('loads the api on configured admin url', function () {
            const req = {
                secure: true,
                method: 'GET',
                url: `${ADMIN_API_URL}/site/`,
                host: 'example.com'
            };

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('redirects the api on localhost', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: `${ADMIN_API_URL}/site/`,
                host: 'localhost'
            };

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(301);
                    response.headers.location.should.eql(`https://example.com${ADMIN_API_URL}/site/`);
                });
        });
    });
});
