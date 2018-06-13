const should = require('should'),
    sinon = require('sinon'),
    cheerio = require('cheerio'),
    testUtils = require('../../utils'),
    configUtils = require('../../utils/configUtils'),
    api = require('../../../server/api'),
    settingsService = require('../../../server/services/settings'),
    themeConfig = require('../../../server/services/themes/config'),
    siteApp = require('../../../server/web/parent-app'),
    sandbox = sinon.sandbox.create();

describe('Integration - Web - Site', function () {
    let app;

    before(testUtils.setup('users:roles', 'posts'));

    describe('default routes.yaml', function () {
        before(function () {
            sandbox.stub(themeConfig, 'create').returns({
                posts_per_page: 2
            });

            testUtils.integrationTesting.urlService.resetGenerators();
            testUtils.integrationTesting.defaultMocks(sandbox);
            testUtils.integrationTesting.overrideGhostConfig(configUtils);

            return testUtils.integrationTesting.initGhost()
                .then(function () {
                    app = siteApp();

                    return testUtils.integrationTesting.urlService.waitTillFinished();
                });
        });

        beforeEach(function () {
            configUtils.set('url', 'http://example.com');

            sandbox.spy(api.posts, 'browse');
        });

        afterEach(function () {
            api.posts.browse.restore();
        });

        after(function () {
            configUtils.restore();
            sandbox.restore();
        });

        describe('behaviour: default cases', function () {
            it('serve post', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/html-ipsum/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('post');
                    });
            });

            it('post not found', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/not-found/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(404);
                        response.template.should.eql('error-404');
                    });
            });

            it('serve static page', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/static-page-test/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('page');
                    });
            });

            it('serve author', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/author/joe-bloggs/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        const $ = cheerio.load(response.body);

                        response.statusCode.should.eql(200);
                        response.template.should.eql('author');

                        $('.author-bio').length.should.equal(1);
                    });
            });

            it('serve tag', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/tag/bacon/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('tag');

                        api.posts.browse.args[0][0].filter.should.eql('tags:\'bacon\'+tags.visibility:public');
                        api.posts.browse.args[0][0].page.should.eql(1);
                        api.posts.browse.args[0][0].limit.should.eql(2);
                    });
            });

            it('serve tag rss', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/tag/bacon/rss/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                    });
            });

            it('serve collection', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        const $ = cheerio.load(response.body);

                        response.statusCode.should.eql(200);
                        response.template.should.eql('index');

                        $('.post-card').length.should.equal(2);

                        should.exist(response.res.locals.context);
                        should.exist(response.res.locals.version);
                        should.exist(response.res.locals.safeVersion);
                        should.exist(response.res.locals.safeVersion);
                        should.exist(response.res.locals.relativeUrl);
                        should.exist(response.res.locals.secure);
                        should.exist(response.res.locals.routerOptions);
                    });
            });

            it('serve collection: page 2', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/page/2/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        const $ = cheerio.load(response.body);

                        response.statusCode.should.eql(200);
                        response.template.should.eql('index');

                        $('.post-card').length.should.equal(2);
                    });
            });

            it('serve public asset', function () {
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

            it('serve theme asset', function () {
                //configUtils.set('url', 'https://example.com');

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
        });

        describe('behaviour: prettify', function () {
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
                    });
            });
        });

        describe('behaviour: url redirects', function () {
            describe('url options', function () {
                it('should not redirect /edit/', function () {
                    const req = {
                        secure: false,
                        host: 'example.com',
                        method: 'GET',
                        url: '/edit/'
                    };

                    return testUtils.mocks.express.invoke(app, req)
                        .then(function (response) {
                            response.statusCode.should.eql(404);
                        });
                });

                it('should redirect static page /edit/', function () {
                    const req = {
                        secure: false,
                        host: 'example.com',
                        method: 'GET',
                        url: '/static-page-test/edit/'
                    };

                    return testUtils.mocks.express.invoke(app, req)
                        .then(function (response) {
                            response.statusCode.should.eql(302);
                        });
                });

                it('should redirect post /edit/', function () {
                    const req = {
                        secure: false,
                        host: 'example.com',
                        method: 'GET',
                        url: '/html-ipsum/edit/'
                    };

                    return testUtils.mocks.express.invoke(app, req)
                        .then(function (response) {
                            response.statusCode.should.eql(302);
                        });
                });
            });

            describe('pagination', function () {
                it('redirect /page/1/ to /', function () {
                    const req = {
                        secure: false,
                        host: 'example.com',
                        method: 'GET',
                        url: '/page/1/'
                    };

                    return testUtils.mocks.express.invoke(app, req)
                        .then(function (response) {
                            response.statusCode.should.eql(301);
                            response.headers.location.should.eql('/');
                        });
                });
            });

            describe('rss', function () {
                it('redirect /feed/ to /rss/', function () {
                    const req = {
                        secure: false,
                        host: 'example.com',
                        method: 'GET',
                        url: '/feed/'
                    };

                    return testUtils.mocks.express.invoke(app, req)
                        .then(function (response) {
                            response.statusCode.should.eql(301);
                            response.headers.location.should.eql('/rss/');
                        });
                });

                it('redirect /rss/1/ to /rss/', function () {
                    const req = {
                        secure: false,
                        host: 'example.com',
                        method: 'GET',
                        url: '/rss/1/'
                    };

                    return testUtils.mocks.express.invoke(app, req)
                        .then(function (response) {
                            response.statusCode.should.eql(301);
                            response.headers.location.should.eql('/rss/');
                        });
                });
            });

            describe('protocol', function () {
                it('blog is https, request is http', function () {
                    configUtils.set('url', 'https://example.com');

                    const req = {
                        secure: false,
                        host: 'example.com',
                        method: 'GET',
                        url: '/html-ipsum'
                    };

                    return testUtils.mocks.express.invoke(app, req)
                        .then(function (response) {
                            response.statusCode.should.eql(301);
                            response.headers.location.should.eql('https://example.com/html-ipsum/');
                        });
                });

                it('blog is https, request is http, trailing slash exists already', function () {
                    configUtils.set('url', 'https://example.com');

                    const req = {
                        secure: false,
                        method: 'GET',
                        url: '/html-ipsum/',
                        host: 'example.com'
                    };

                    return testUtils.mocks.express.invoke(app, req)
                        .then(function (response) {
                            response.statusCode.should.eql(301);
                            response.headers.location.should.eql('https://example.com/html-ipsum/');
                        });
                });
            });

            describe('assets', function () {
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

    describe('extended routes.yaml (1): 2 collections', function () {
        describe('behaviour: default cases', function () {
            before(function () {
                sandbox.stub(settingsService, 'get').returns({
                    routes: {
                        '/': 'home'
                    },

                    collections: {
                        '/podcast/': {
                            permalink: '/podcast/:slug/',
                            filter: 'featured:true'
                        },

                        '/something/': {
                            permalink: '/something/:slug/'
                        }
                    },

                    taxonomies: {
                        tag: '/categories/:slug/',
                        author: '/authors/:slug/'
                    }
                });

                testUtils.integrationTesting.urlService.resetGenerators();
                testUtils.integrationTesting.defaultMocks(sandbox);

                return testUtils.integrationTesting.initGhost()
                    .then(function () {
                        app = siteApp();

                        return testUtils.integrationTesting.urlService.waitTillFinished();
                    });
            });

            beforeEach(function () {
                testUtils.integrationTesting.overrideGhostConfig(configUtils);
            });

            afterEach(function () {
                configUtils.restore();
            });

            after(function () {
                sandbox.restore();
            });

            it('serve home', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);

                        // falls back to index, because Casper has no home.hbs
                        response.template.should.eql('index');
                    });
            });

            it('serve rss', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/podcast/rss/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                    });
            });

            it('serve post', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/something/html-ipsum/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('post');
                    });
            });

            it('serve collection: podcast', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/podcast/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        const $ = cheerio.load(response.body);

                        response.statusCode.should.eql(200);
                        response.template.should.eql('index');

                        $('.post-card').length.should.equal(2);
                    });
            });

            it('serve collection: something', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/something/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        const $ = cheerio.load(response.body);

                        response.statusCode.should.eql(200);
                        response.template.should.eql('index');

                        $('.post-card').length.should.equal(2);
                    });
            });
        });

        describe('no collections', function () {
            before(function () {
                sandbox.stub(settingsService, 'get').returns({
                    routes: {
                        '/test/': 'test'
                    },
                    collections: {},
                    taxonomies: {}
                });

                testUtils.integrationTesting.urlService.resetGenerators();
                testUtils.integrationTesting.defaultMocks(sandbox);

                return testUtils.integrationTesting.initGhost()
                    .then(function () {
                        app = siteApp();

                        return testUtils.integrationTesting.urlService.waitTillFinished();
                    });
            });

            beforeEach(function () {
                testUtils.integrationTesting.overrideGhostConfig(configUtils);
            });

            afterEach(function () {
                configUtils.restore();
            });

            after(function () {
                sandbox.restore();
            });

            it('serve route', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/test/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('index');
                    });
            });
        });
    });

    describe('extended routes.yaml (2): static permalink route', function () {
        before(function () {
            sandbox.stub(settingsService, 'get').returns({
                routes: {},

                collections: {
                    '/podcast/': {
                        permalink: '/featured/',
                        filter: 'featured:true'
                    },

                    '/': {
                        permalink: '/:slug/'
                    }
                },

                taxonomies: {}
            });

            testUtils.integrationTesting.urlService.resetGenerators();
            testUtils.integrationTesting.defaultMocks(sandbox);

            return testUtils.integrationTesting.initGhost()
                .then(function () {
                    app = siteApp();

                    return testUtils.integrationTesting.urlService.waitTillFinished();
                });
        });

        beforeEach(function () {
            testUtils.integrationTesting.overrideGhostConfig(configUtils);
        });

        afterEach(function () {
            configUtils.restore();
        });

        after(function () {
            sandbox.restore();
        });

        describe('behaviour: default cases', function () {
            it('serve post', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/featured/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        // We can't find a post with the slug "featured"
                        response.statusCode.should.eql(404);
                        response.template.should.eql('error-404');
                    });
            });

            it('serve post', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/html-ipsum/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('post');
                    });
            });

            it('serve author', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/author/joe-bloggs/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(404);
                        response.template.should.eql('error-404');
                    });
            });

            it('serve tag', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/tag/bacon/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(404);
                        response.template.should.eql('error-404');
                    });
            });
        });
    });

    describe('extended routes.yaml (3): templates', function () {
        describe('(3) (1)', function () {
            before(function () {
                sandbox.stub(settingsService, 'get').returns({
                    routes: {},

                    collections: {
                        '/': {
                            permalink: '/:slug/',
                            template: ['default']
                        },
                        '/magic/': {
                            permalink: '/magic/:slug/'
                        }
                    }
                });

                testUtils.integrationTesting.urlService.resetGenerators();
                testUtils.integrationTesting.defaultMocks(sandbox);

                return testUtils.integrationTesting.initGhost()
                    .then(function () {
                        app = siteApp();

                        return testUtils.integrationTesting.urlService.waitTillFinished();
                    });
            });

            beforeEach(function () {
                testUtils.integrationTesting.overrideGhostConfig(configUtils);
            });

            afterEach(function () {
                configUtils.restore();
            });

            after(function () {
                sandbox.restore();
            });

            it('serve collection', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('default');
                    });
            });

            it('serve second collectiom', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/magic/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('index');
                    });
            });
        });

        describe('(3) (2)', function () {
            before(function () {
                sandbox.stub(settingsService, 'get').returns({
                    routes: {},

                    collections: {
                        '/': {
                            permalink: '/:slug/',
                            template: ['something', 'default']
                        }
                    }
                });

                testUtils.integrationTesting.urlService.resetGenerators();
                testUtils.integrationTesting.defaultMocks(sandbox);

                return testUtils.integrationTesting.initGhost()
                    .then(function () {
                        app = siteApp();

                        return testUtils.integrationTesting.urlService.waitTillFinished();
                    });
            });

            beforeEach(function () {
                testUtils.integrationTesting.overrideGhostConfig(configUtils);
            });

            afterEach(function () {
                configUtils.restore();
            });

            after(function () {
                sandbox.restore();
            });

            it('serve collection', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('default');
                    });
            });
        });

        describe('(3) (3)', function () {
            before(function () {
                sandbox.stub(settingsService, 'get').returns({
                    routes: {},

                    collections: {
                        '/': {
                            permalink: '/:slug/',
                            template: ['something', 'default']
                        },
                        '/magic/': {
                            permalink: '/magic/:slug/',
                            template: ['something', 'default']
                        }
                    }
                });

                testUtils.integrationTesting.urlService.resetGenerators();
                testUtils.integrationTesting.defaultMocks(sandbox, {theme: 'test-theme'});

                return testUtils.integrationTesting.initGhost()
                    .then(function () {
                        app = siteApp();

                        return testUtils.integrationTesting.urlService.waitTillFinished();
                    });
            });

            beforeEach(function () {
                testUtils.integrationTesting.overrideGhostConfig(configUtils);
            });

            afterEach(function () {
                configUtils.restore();
            });

            after(function () {
                sandbox.restore();
            });

            it('serve collection', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('home');
                    });
            });

            it('serve second page collection: should use index.hbs', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/magic/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('something');
                    });
            });
        });
    });

    describe('extended routes.yaml (4): primary author permalink', function () {
        before(function () {
            sandbox.stub(settingsService, 'get').returns({
                routes: {},

                collections: {
                    '/something/': {
                        permalink: '/:primary_author/:slug/'
                    }
                },

                taxonomies: {}
            });

            testUtils.integrationTesting.urlService.resetGenerators();
            testUtils.integrationTesting.defaultMocks(sandbox);

            return testUtils.integrationTesting.initGhost()
                .then(function () {
                    app = siteApp();

                    return testUtils.integrationTesting.urlService.waitTillFinished();
                });
        });

        beforeEach(function () {
            testUtils.integrationTesting.overrideGhostConfig(configUtils);
        });

        afterEach(function () {
            configUtils.restore();
        });

        after(function () {
            sandbox.restore();
        });

        describe('behaviour: default cases', function () {
            it('serve post', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/joe-bloggs/html-ipsum/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('post');
                    });
            });

            it('post without author', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/html-ipsum/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(404);
                        response.template.should.eql('error-404');
                    });
            });

            it('page', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/static-page-test/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('page');
                    });
            });
        });
    });

    describe('extended routes.yaml (4): primary tag permalink', function () {
        before(function () {
            sandbox.stub(settingsService, 'get').returns({
                routes: {},

                collections: {
                    '/something/': {
                        permalink: '/something/:primary_tag/:slug/'
                    }
                },

                taxonomies: {}
            });

            testUtils.integrationTesting.urlService.resetGenerators();
            testUtils.integrationTesting.defaultMocks(sandbox);

            return testUtils.integrationTesting.initGhost()
                .then(function () {
                    app = siteApp();

                    return testUtils.integrationTesting.urlService.waitTillFinished();
                });
        });

        beforeEach(function () {
            testUtils.integrationTesting.overrideGhostConfig(configUtils);
        });

        afterEach(function () {
            configUtils.restore();
        });

        after(function () {
            sandbox.restore();
        });

        describe('behaviour: default cases', function () {
            it('serve post', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/something/kitchen-sink/html-ipsum/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('post');
                    });
            });

            it('post without tag', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/something/html-ipsum/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(404);
                        response.template.should.eql('error-404');
                    });
            });

            it('post without tag', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/html-ipsum/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(404);
                        response.template.should.eql('error-404');
                    });
            });

            it('page', function () {
                const req = {
                    secure: true,
                    method: 'GET',
                    url: '/static-page-test/',
                    host: 'example.com'
                };

                return testUtils.mocks.express.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('page');
                    });
            });
        });
    });
});
