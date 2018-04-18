'use strict';

const should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    testUtils = require('../utils/index'),
    configUtils = require('../utils/configUtils'),
    siteApp = require('../../server/web/site/app'),
    urlService = require('../../server/services/url'),
    models = require('../../server/models'),
    sandbox = sinon.sandbox.create();

describe('Integration - Web - Site', function () {
    let app;

    beforeEach(function () {
        app = siteApp();

        sandbox.stub(urlService, 'hasFinished').returns(true);
        return testUtils.configureGhost(sandbox);
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    describe('component: prettify', function () {
        it('url without slash', function () {
            const req = {
                secure: false,
                method: 'GET',
                url: '/prettify-me',
                host: 'example.com'
            };

            return testUtils.mocks.express.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(301);
                    response.headers.location.should.eql('/prettify-me/');
                    urlService.hasFinished.calledOnce.should.be.true();
                });
        });
    });

    describe('component: url redirects', function () {
        describe('page', function () {
            it('success', function () {
                const post = testUtils.DataGenerator.forKnex.createPost({slug: 'cars'});
                configUtils.set('url', 'https://example.com');

                sandbox.stub(models.Post, 'findOne')
                    .resolves(models.Post.forge(post));

                sandbox.stub(urlService, 'getUrlByResourceId').withArgs(post.id).returns('/cars/');

                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/cars/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('post');
                        urlService.hasFinished.calledOnce.should.be.true();
                    });
            });

            it('blog is https, request is http', function () {
                configUtils.set('url', 'https://example.com');

                const req = {
                    secure: false,
                    host: 'example.com',
                    method: 'GET',
                    url: '/cars'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(301);
                        response.headers.location.should.eql('https://example.com/cars/');
                    });
            });

            it('blog is https, request is http, trailing slash exists already', function () {
                configUtils.set('url', 'https://example.com');

                const req = {
                    secure: false,
                    method: 'GET',
                    url: '/cars/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(301);
                        response.headers.location.should.eql('https://example.com/cars/');
                    });
            });
        });

        describe('assets', function () {
            it('success', function () {
                const req = {
                    secure: false,
                    method: 'GET',
                    url: '/public/ghost-sdk.js',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                    });
            });

            it('success', function () {
                configUtils.set('url', 'https://example.com');

                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/assets/css/screen.css',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                    });
            });

            it('blog is https, request is http', function () {
                configUtils.set('url', 'https://example.com');

                const req = {
                    secure: false,
                    method: 'GET',
                    url: '/public/ghost-sdk.js',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(301);
                        response.headers.location.should.eql('https://example.com/public/ghost-sdk.js');
                    });
            });

            it('blog is https, request is http', function () {
                configUtils.set('url', 'https://example.com');

                const req = {
                    secure: false,
                    method: 'GET',
                    url: '/favicon.png',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(301);
                        response.headers.location.should.eql('https://example.com/favicon.png');
                    });
            });

            it('blog is https, request is http', function () {
                configUtils.set('url', 'https://example.com');

                const req = {
                    secure: false,
                    method: 'GET',
                    url: '/assets/css/main.css',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(301);
                        response.headers.location.should.eql('https://example.com/assets/css/main.css');
                    });
            });
        });
    });
});
