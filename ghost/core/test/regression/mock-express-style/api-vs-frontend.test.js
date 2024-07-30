const should = require('should');
const sinon = require('sinon');
const cheerio = require('cheerio');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const configUtils = require('../../utils/configUtils');
const urlUtils = require('../../utils/urlUtils');

const routeSettingsService = require('../../../core/server/services/route-settings');
const themeEngine = require('../../../core/frontend/services/theme-engine');

describe('Frontend behavior tests', function () {
    let app;

    before(localUtils.urlService.resetGenerators);
    before(testUtils.teardownDb);
    before(testUtils.setup('users:roles', 'posts'));

    let postSpy;

    describe('default routes.yaml', function () {
        before(async function () {
            localUtils.defaultMocks(sinon, {amp: true});
            localUtils.overrideGhostConfig(configUtils);

            app = await localUtils.initGhost();
        });

        before(function () {
            configUtils.set('url', 'http://example.com');
            urlUtils.stubUrlUtilsFromConfig();
        });

        beforeEach(function () {
            sinon.stub(themeEngine.getActive(), 'config').withArgs('posts_per_page').returns(2);
            const postsAPI = require('../../../core/server/api/endpoints').postsPublic;
            postSpy = sinon.spy(postsAPI, 'browse');
        });

        afterEach(function () {
            postSpy.restore();
            sinon.restore();
        });

        after(async function () {
            await configUtils.restore();
            urlUtils.restore();
            sinon.restore();
        });

        describe('behavior: default cases', function () {
            it('serve post', function () {
                const req = {
                    method: 'GET',
                    url: '/html-ipsum/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('post');
                    });
            });

            describe('AMP enabled', function () {
                it('serve amp', function () {
                    localUtils.defaultMocks(sinon, {amp: true});
                    const req = {
                        method: 'GET',
                        url: '/html-ipsum/amp/',
                        host: 'example.com'
                    };

                    return localUtils.mockExpress.invoke(app, req)
                        .then(function (response) {
                            response.statusCode.should.eql(200);
                            response.template.should.match(/amp\.hbs/);
                            response.body.should.match(/<h1>HTML Ipsum Presents<\/h1>/);
                        });
                });
            });

            describe('AMP disabled', function () {
                it('serve amp', function () {
                    localUtils.defaultMocks(sinon, {amp: false});
                    const req = {
                        method: 'GET',
                        url: '/html-ipsum/amp/',
                        host: 'example.com'
                    };

                    return localUtils.mockExpress.invoke(app, req)
                        .then(function (response) {
                            response.statusCode.should.eql(301);
                        });
                });
            });

            it('post not found', function () {
                const req = {
                    method: 'GET',
                    url: '/not-found/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(404);
                        response.template.should.eql('error-404');
                    });
            });

            it('serve static page', function () {
                const req = {
                    method: 'GET',
                    url: '/static-page-test/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('page');
                    });
            });

            it('serve author', function () {
                const req = {
                    method: 'GET',
                    url: '/author/joe-bloggs/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('author');

                        const bodyClasses = response.body.match(/<body[^>]*class="([^"]*?)">/)[1].split(' ');
                        bodyClasses.should.containEql('author-template');
                        bodyClasses.should.containEql('author-joe-bloggs');
                    });
            });

            it('serve tag', async function () {
                const req = {
                    method: 'GET',
                    url: '/tag/bacon/',
                    host: 'example.com'
                };

                const response = await localUtils.mockExpress.invoke(app, req);
                response.statusCode.should.eql(200);
                response.template.should.eql('tag');

                postSpy.args[0][0].filter.should.eql('tags:\'bacon\'+tags.visibility:public');
                postSpy.args[0][0].page.should.eql(1);
                postSpy.args[0][0].limit.should.eql(2);
            });

            it('serve tag rss', function () {
                const req = {
                    method: 'GET',
                    url: '/tag/bacon/rss/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                    });
            });

            it('serve collection', function () {
                const req = {
                    method: 'GET',
                    url: '/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
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
                        should.exist(response.res.routerOptions);
                    });
            });

            it('serve collection: page 2', function () {
                const req = {
                    method: 'GET',
                    url: '/page/2/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        const $ = cheerio.load(response.body);

                        response.statusCode.should.eql(200);
                        response.template.should.eql('index');

                        $('.post-card').length.should.equal(2);
                    });
            });

            it('serve theme asset', function () {
                const req = {
                    method: 'GET',
                    url: '/assets/built/screen.css',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                    });
            });
        });

        describe('behavior: prettify', function () {
            it('url without slash', function () {
                const req = {
                    secure: false,
                    method: 'GET',
                    url: '/prettify-me',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(301);
                        response.headers.location.should.eql('/prettify-me/');
                    });
            });
        });

        describe('behavior: url redirects', function () {
            describe('pagination', function () {
                it('redirect /page/1/ to /', function () {
                    const req = {
                        secure: false,
                        host: 'example.com',
                        method: 'GET',
                        url: '/page/1/'
                    };

                    return localUtils.mockExpress.invoke(app, req)
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

                    return localUtils.mockExpress.invoke(app, req)
                        .then(function (response) {
                            response.statusCode.should.eql(301);
                            response.headers.location.should.eql('/rss/');
                        });
                });
            });
        });
    });

    describe('https site: http requests redirect to https', function () {
        before(function () {
            configUtils.set('url', 'https://example.com');
            urlUtils.stubUrlUtilsFromConfig();
        });

        after(async function () {
            urlUtils.restore();
            await configUtils.restore();
        });

        describe('protocol', function () {
            it('blog is https, request is http', function () {
                const req = {
                    secure: false,
                    host: 'example.com',
                    method: 'GET',
                    url: '/html-ipsum'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(301);
                        response.headers.location.should.eql('https://example.com/html-ipsum/');
                    });
            });

            it('blog is https, request is http, trailing slash exists already', function () {
                const req = {
                    secure: false,
                    method: 'GET',
                    url: '/html-ipsum/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(301);
                        response.headers.location.should.eql('https://example.com/html-ipsum/');
                    });
            });
        });

        describe('assets', function () {
            it('blog is https, request is http (png)', function () {
                const req = {
                    secure: false,
                    method: 'GET',
                    url: '/favicon.png',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(301);
                        response.headers.location.should.eql('https://example.com/favicon.png');
                    });
            });

            it('blog is https, request is http (css)', function () {
                const req = {
                    secure: false,
                    method: 'GET',
                    url: '/assets/css/main.css',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(301);
                        response.headers.location.should.eql('https://example.com/assets/css/main.css');
                    });
            });
        });
    });

    describe('extended routes.yaml: collections', function () {
        describe('2 collections', function () {
            before(async function () {
                sinon.stub(routeSettingsService, 'loadRouteSettings').get(() => () => ({
                    routes: {
                        '/': {templates: ['home']}
                    },

                    collections: {
                        '/podcast/': {
                            permalink: '/podcast/:slug/',
                            filter: 'featured:true'
                        },

                        '/something/': {
                            permalink: '/something/:slug/',
                            filter: 'featured:false'
                        }
                    },

                    taxonomies: {
                        tag: '/categories/:slug/',
                        author: '/authors/:slug/'
                    }
                }));

                localUtils.urlService.resetGenerators();
                localUtils.defaultMocks(sinon, {theme: 'test-theme'});

                app = await localUtils.initGhost();
            });

            beforeEach(function () {
                localUtils.overrideGhostConfig(configUtils);
            });

            afterEach(async function () {
                await configUtils.restore();
                urlUtils.restore();
            });

            after(function () {
                sinon.restore();
            });

            it('serve static route', function () {
                const req = {
                    method: 'GET',
                    url: '/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('home');
                    });
            });

            it('serve rss', function () {
                const req = {
                    method: 'GET',
                    url: '/podcast/rss/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                    });
            });

            it('serve post', function () {
                const req = {
                    method: 'GET',
                    url: '/something/html-ipsum/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('post');
                    });
            });

            it('serve collection: podcast with default template', function () {
                const req = {
                    method: 'GET',
                    url: '/podcast/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        const $ = cheerio.load(response.body);

                        response.statusCode.should.eql(200);
                        response.template.should.eql('index');

                        $('.post-card').length.should.equal(2);
                    });
            });

            it('serve collection: something with custom template', function () {
                const req = {
                    method: 'GET',
                    url: '/something/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('something');
                    });
            });
        });

        describe('no collections', function () {
            before(async function () {
                sinon.stub(routeSettingsService, 'loadRouteSettings').get(() => () => ({
                    routes: {
                        '/something/': {
                            templates: ['something']
                        }
                    },
                    collections: {},
                    taxonomies: {}
                }));

                localUtils.urlService.resetGenerators();
                localUtils.defaultMocks(sinon, {theme: 'test-theme'});

                app = await localUtils.initGhost();
            });

            beforeEach(function () {
                localUtils.overrideGhostConfig(configUtils);
            });

            afterEach(async function () {
                await configUtils.restore();
                urlUtils.restore();
            });

            after(function () {
                sinon.restore();
            });

            it('serve route', function () {
                const req = {
                    method: 'GET',
                    url: '/something/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('something');
                    });
            });
        });

        describe('static permalink route', function () {
            before(async function () {
                sinon.stub(routeSettingsService, 'loadRouteSettings').get(() => () => ({
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
                }));

                localUtils.urlService.resetGenerators();
                localUtils.defaultMocks(sinon);

                app = await localUtils.initGhost();
            });

            beforeEach(function () {
                localUtils.overrideGhostConfig(configUtils);
            });

            afterEach(async function () {
                await configUtils.restore();
                urlUtils.restore();
            });

            after(function () {
                sinon.restore();
            });

            it('serve 404 when there is post with given slug', function () {
                const req = {

                    method: 'GET',
                    url: '/featured/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        // We can't find a post with the slug "featured"
                        response.statusCode.should.eql(404);
                        response.template.should.eql('error-404');
                    });
            });

            it('serve post', function () {
                const req = {
                    method: 'GET',
                    url: '/html-ipsum/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('post');
                    });
            });

            it('serve author', function () {
                const req = {
                    method: 'GET',
                    url: '/author/joe-bloggs/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(404);
                        response.template.should.eql('error-404');
                    });
            });

            it('serve tag', function () {
                const req = {
                    method: 'GET',
                    url: '/tag/bacon/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(404);
                        response.template.should.eql('error-404');
                    });
            });
        });

        describe('primary author permalink', function () {
            before(async function () {
                sinon.stub(routeSettingsService, 'loadRouteSettings').get(() => () => ({
                    routes: {},

                    collections: {
                        '/something/': {
                            permalink: '/:primary_author/:slug/'
                        }
                    },

                    taxonomies: {}
                }));

                localUtils.urlService.resetGenerators();
                localUtils.defaultMocks(sinon);

                app = await localUtils.initGhost();
            });

            beforeEach(function () {
                localUtils.overrideGhostConfig(configUtils);
            });

            afterEach(async function () {
                await configUtils.restore();
                urlUtils.restore();
            });

            after(function () {
                sinon.restore();
            });

            it('serve post', function () {
                const req = {
                    method: 'GET',
                    url: '/joe-bloggs/html-ipsum/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('post');
                    });
            });

            it('post without author', function () {
                const req = {
                    method: 'GET',
                    url: '/html-ipsum/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(404);
                        response.template.should.eql('error-404');
                    });
            });

            it('page', function () {
                const req = {
                    method: 'GET',
                    url: '/static-page-test/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('page');
                    });
            });
        });

        describe('primary tag permalink', function () {
            before(async function () {
                sinon.stub(routeSettingsService, 'loadRouteSettings').get(() => () => ({
                    routes: {},

                    collections: {
                        '/something/': {
                            permalink: '/something/:primary_tag/:slug/'
                        }
                    },

                    taxonomies: {}
                }));

                localUtils.urlService.resetGenerators();
                localUtils.defaultMocks(sinon);

                app = await localUtils.initGhost();
            });

            beforeEach(function () {
                localUtils.overrideGhostConfig(configUtils);
            });

            afterEach(async function () {
                await configUtils.restore();
                urlUtils.restore();
            });

            after(function () {
                sinon.restore();
            });

            it('serve post', function () {
                const req = {
                    method: 'GET',
                    url: '/something/kitchen-sink/html-ipsum/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('post');
                    });
            });

            it('post without tag on something collection', function () {
                const req = {
                    method: 'GET',
                    url: '/something/html-ipsum/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(404);
                        response.template.should.eql('error-404');
                    });
            });

            it('post without tag', function () {
                const req = {
                    method: 'GET',
                    url: '/html-ipsum/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(404);
                        response.template.should.eql('error-404');
                    });
            });

            it('page', function () {
                const req = {
                    method: 'GET',
                    url: '/static-page-test/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('page');
                    });
            });
        });

        describe('collection/routes with data key', function () {
            before(async function () {
                sinon.stub(routeSettingsService, 'loadRouteSettings').get(() => () => ({
                    routes: {
                        '/my-page/': {
                            data: {
                                query: {
                                    page: {
                                        controller: 'pagesPublic',
                                        resource: 'pages',
                                        type: 'read',
                                        options: {
                                            slug: 'static-page-test'
                                        }
                                    }
                                },
                                router: {
                                    pages: [{redirect: true, slug: 'static-page-test'}]
                                }
                            },
                            templates: ['page']
                        }
                    },

                    collections: {
                        '/food/': {
                            permalink: '/food/:slug/',
                            filter: 'tag:bacon+tag:-chorizo',
                            data: {
                                query: {
                                    tag: {
                                        controller: 'tagsPublic',
                                        resource: 'tags',
                                        type: 'read',
                                        options: {
                                            slug: 'bacon'
                                        }
                                    }
                                },
                                router: {
                                    tags: [{redirect: true, slug: 'bacon'}]
                                }
                            }
                        },
                        '/sport/': {
                            permalink: '/sport/:slug/',
                            filter: 'tag:chorizo+tag:-bacon',
                            data: {
                                query: {
                                    apollo: {
                                        controller: 'tagsPublic',
                                        resource: 'tags',
                                        type: 'read',
                                        options: {
                                            slug: 'chorizo'
                                        }
                                    }
                                },
                                router: {
                                    tags: [{redirect: false, slug: 'chorizo'}]
                                }
                            }
                        }
                    },

                    taxonomies: {
                        tag: '/categories/:slug/',
                        author: '/authors/:slug/'
                    }
                }));

                localUtils.urlService.resetGenerators();
                localUtils.defaultMocks(sinon);

                app = await localUtils.initGhost();
            });

            beforeEach(function () {
                localUtils.overrideGhostConfig(configUtils);
            });

            afterEach(async function () {
                await configUtils.restore();
                urlUtils.restore();
            });

            after(function () {
                sinon.restore();
            });

            it('serve /food/', function () {
                const req = {
                    method: 'GET',
                    url: '/food/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('index');
                    });
            });

            it('serve bacon tag', function () {
                const req = {
                    method: 'GET',
                    url: '/categories/bacon/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(301);
                    });
            });

            it('serve /sport/', function () {
                const req = {
                    method: 'GET',
                    url: '/sport/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('index');
                    });
            });

            it('serve chorizo tag', function () {
                const req = {
                    method: 'GET',
                    url: '/categories/chorizo/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                    });
            });

            it('serve my-page', function () {
                const req = {
                    method: 'GET',
                    url: '/my-page/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                    });
            });
        });
    });

    describe('extended routes.yaml: templates', function () {
        describe('default template, no template', function () {
            before(async function () {
                sinon.stub(routeSettingsService, 'loadRouteSettings').get(() => () => ({
                    routes: {},

                    collections: {
                        '/': {
                            permalink: '/:slug/',
                            templates: ['default']
                        },
                        '/magic/': {
                            permalink: '/magic/:slug/'
                        }
                    }
                }));

                localUtils.urlService.resetGenerators();
                localUtils.defaultMocks(sinon);

                app = await localUtils.initGhost();
            });

            beforeEach(function () {
                localUtils.overrideGhostConfig(configUtils);
            });

            afterEach(async function () {
                await configUtils.restore();
                urlUtils.restore();
                sinon.restore();
            });

            it('serve collection', function () {
                const req = {
                    method: 'GET',
                    url: '/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('default');
                    });
            });

            it('serve second collectiom', function () {
                const req = {
                    method: 'GET',
                    url: '/magic/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('index');
                    });
            });
        });

        describe('two templates', function () {
            before(async function () {
                sinon.stub(routeSettingsService, 'loadRouteSettings').get(() => () => ({
                    routes: {},

                    collections: {
                        '/': {
                            permalink: '/:slug/',
                            templates: ['something', 'default']
                        }
                    }
                }));

                localUtils.urlService.resetGenerators();
                localUtils.defaultMocks(sinon);

                app = await localUtils.initGhost();
            });

            beforeEach(function () {
                localUtils.overrideGhostConfig(configUtils);
            });

            afterEach(async function () {
                await configUtils.restore();
                urlUtils.restore();
            });

            after(function () {
                sinon.restore();
            });

            it('serve collection', function () {
                const req = {
                    method: 'GET',
                    url: '/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('default');
                    });
            });
        });

        describe('home.hbs priority', function () {
            before(async function () {
                sinon.stub(routeSettingsService, 'loadRouteSettings').get(() => () => ({
                    routes: {},

                    collections: {
                        '/': {
                            permalink: '/:slug/',
                            templates: ['something', 'default']
                        },
                        '/magic/': {
                            permalink: '/magic/:slug/',
                            templates: ['something', 'default']
                        }
                    }
                }));

                localUtils.urlService.resetGenerators();
                localUtils.defaultMocks(sinon, {theme: 'test-theme'});

                app = await localUtils.initGhost();
            });

            beforeEach(function () {
                localUtils.overrideGhostConfig(configUtils);
            });

            afterEach(async function () {
                await configUtils.restore();
                urlUtils.restore();
                sinon.restore();
            });

            it('serve collection', function () {
                const req = {
                    method: 'GET',
                    url: '/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('home');
                    });
            });

            it('serve second page collection: should use index.hbs', function () {
                const req = {
                    method: 'GET',
                    url: '/magic/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('something');
                    });
            });
        });
    });

    describe('extended routes.yaml: routes', function () {
        describe('channels', function () {
            before(localUtils.urlService.resetGenerators);
            before(testUtils.teardownDb);
            before(testUtils.setup('users:roles', 'posts'));

            before(async function () {
                localUtils.defaultMocks(sinon, {theme: 'test-theme-channels'});

                sinon.stub(routeSettingsService, 'loadRouteSettings').get(() => () => ({
                    routes: {
                        '/channel1/': {
                            controller: 'channel',
                            filter: 'tag:kitchen-sink',
                            data: {
                                query: {
                                    tag: {
                                        controller: 'tagsPublic',
                                        resource: 'tags',
                                        type: 'read',
                                        options: {
                                            slug: 'kitchen-sink'
                                        }
                                    }
                                },
                                router: {
                                    tags: [{redirect: true, slug: 'kitchen-sink'}]
                                }
                            }
                        },

                        '/channel2/': {
                            controller: 'channel',
                            filter: 'tag:bacon',
                            data: {
                                query: {
                                    tag: {
                                        controller: 'tagsPublic',
                                        resource: 'tags',
                                        type: 'read',
                                        options: {
                                            slug: 'bacon'
                                        }
                                    }
                                },
                                router: {
                                    tags: [{redirect: true, slug: 'bacon'}]
                                }
                            },
                            templates: ['default']
                        },

                        '/channel3/': {
                            controller: 'channel',
                            filter: 'author:joe-bloggs',
                            data: {
                                query: {
                                    joe: {
                                        controller: 'authorsPublic',
                                        resource: 'authors',
                                        type: 'read',
                                        options: {
                                            slug: 'joe-bloggs',
                                            redirect: false
                                        }
                                    }
                                },
                                router: {
                                    authors: [{redirect: false, slug: 'joe-bloggs'}]
                                }
                            }
                        },

                        '/channel4/': {
                            controller: 'channel',
                            filter: 'author:joe-bloggs'
                        },

                        '/channel5/': {
                            controller: 'channel',
                            data: {
                                query: {
                                    tag: {
                                        controller: 'authorsPublic',
                                        resource: 'authors',
                                        type: 'read',
                                        options: {
                                            slug: 'joe-bloggs',
                                            redirect: false
                                        }
                                    }
                                },
                                router: {
                                    authors: [{redirect: false, slug: 'joe-bloggs'}]
                                }
                            }
                        },

                        '/channel6/': {
                            controller: 'channel',
                            data: {
                                query: {
                                    post: {
                                        controller: 'postsPublic',
                                        resource: 'posts',
                                        type: 'read',
                                        options: {
                                            slug: 'html-ipsum',
                                            redirect: true
                                        }
                                    }
                                },
                                router: {
                                    posts: [{redirect: true, slug: 'html-ipsum'}]
                                }
                            }
                        }
                    },

                    collections: {
                        '/': {
                            permalink: '/:slug/'
                        }
                    },

                    taxonomies: {
                        tag: '/tag/:slug/',
                        author: '/author/:slug/'
                    }
                }));

                app = await localUtils.initGhost();
                sinon.stub(themeEngine.getActive(), 'config').withArgs('posts_per_page').returns(10);
            });

            beforeEach(function () {
                localUtils.overrideGhostConfig(configUtils);
            });

            afterEach(async function () {
                await configUtils.restore();
                urlUtils.restore();
            });

            after(function () {
                sinon.restore();
            });

            it('serve channel 1', function () {
                const req = {
                    method: 'GET',
                    url: '/channel1/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        const $ = cheerio.load(response.body);

                        response.statusCode.should.eql(200);
                        response.template.should.eql('index');

                        $('.post-card').length.should.equal(2);
                    });
            });

            it('serve channel 1: rss', function () {
                const req = {
                    method: 'GET',
                    url: '/channel1/rss/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.headers['content-type'].should.eql('application/rss+xml; charset=UTF-8');
                    });
            });

            it('serve channel 2', function () {
                const req = {
                    method: 'GET',
                    url: '/channel2/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        const $ = cheerio.load(response.body);

                        response.statusCode.should.eql(200);
                        response.template.should.eql('default');

                        // default template does not list posts
                        $('.post-card').length.should.equal(0);
                    });
            });

            it('serve channel 3', function () {
                const req = {
                    method: 'GET',
                    url: '/channel3/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                        response.template.should.eql('channel3');
                    });
            });

            it('serve channel 4', function () {
                const req = {
                    method: 'GET',
                    url: '/channel4/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        const $ = cheerio.load(response.body);

                        response.statusCode.should.eql(200);
                        response.template.should.eql('index');

                        $('.post-card').length.should.equal(4);
                    });
            });

            it('serve channel 5', function () {
                const req = {
                    method: 'GET',
                    url: '/channel5/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        const $ = cheerio.load(response.body);

                        response.statusCode.should.eql(200);
                        response.template.should.eql('index');

                        $('.post-card').length.should.equal(10);
                    });
            });

            it('serve channel 6', function () {
                const req = {
                    method: 'GET',
                    url: '/channel6/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        const $ = cheerio.load(response.body);

                        response.statusCode.should.eql(200);
                        response.template.should.eql('index');

                        $('.post-card').length.should.equal(10);
                    });
            });

            it('serve kitching-sink: redirect', function () {
                const req = {
                    method: 'GET',
                    url: '/tag/kitchen-sink/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(301);
                        response.headers.location.should.eql('/channel1/');
                    });
            });

            it('serve html-ipsum: redirect', function () {
                const req = {
                    method: 'GET',
                    url: '/html-ipsum/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(301);
                        response.headers.location.should.eql('/channel6/');
                    });
            });

            it('serve chorizo: no redirect', function () {
                const req = {
                    method: 'GET',
                    url: '/tag/chorizo/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                    });
            });

            it('serve joe-bloggs', function () {
                const req = {

                    method: 'GET',
                    url: '/author/joe-bloggs/',
                    host: 'example.com'
                };

                return localUtils.mockExpress.invoke(app, req)
                    .then(function (response) {
                        response.statusCode.should.eql(200);
                    });
            });
        });
    });

    describe('extended routes.yaml (5): rss override', function () {
        before(async function () {
            sinon.stub(routeSettingsService, 'loadRouteSettings').get(() => () => ({
                routes: {
                    '/podcast/rss/': {
                        templates: ['podcast/rss'],
                        content_type: 'application/rss+xml'
                    },
                    '/cooking/': {
                        controller: 'channel',
                        rss: false
                    },
                    '/flat/': {
                        controller: 'channel'
                    }
                },

                collections: {
                    '/podcast/': {
                        permalink: '/:slug/',
                        filter: 'featured:true',
                        templates: ['home'],
                        rss: false
                    },
                    '/music/': {
                        permalink: '/:slug/',
                        rss: false
                    },
                    '/': {
                        permalink: '/:slug/'
                    }
                },

                taxonomies: {}
            }));

            localUtils.urlService.resetGenerators();
            localUtils.defaultMocks(sinon, {theme: 'test-theme'});

            app = await localUtils.initGhost();
        });

        beforeEach(function () {
            localUtils.overrideGhostConfig(configUtils);
        });

        afterEach(async function () {
            await configUtils.restore();
            urlUtils.restore();
        });

        after(function () {
            sinon.restore();
        });

        it('serve /rss/', function () {
            const req = {
                method: 'GET',
                url: '/rss/',
                host: 'example.com'
            };

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('serve /music/rss/', function () {
            const req = {
                method: 'GET',
                url: '/music/rss/',
                host: 'example.com'
            };

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(404);
                });
        });

        it('serve /cooking/rss/', function () {
            const req = {
                method: 'GET',
                url: '/cooking/rss/',
                host: 'example.com'
            };

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(404);
                });
        });

        it('serve /flat/rss/', function () {
            const req = {
                method: 'GET',
                url: '/flat/rss/',
                host: 'example.com'
            };

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                });
        });

        it('serve /podcast/rss/', function () {
            const req = {
                method: 'GET',
                url: '/podcast/rss/',
                host: 'example.com'
            };

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    response.statusCode.should.eql(200);
                    response.template.should.eql('podcast/rss');
                    response.headers['content-type'].should.eql('application/rss+xml');
                    response.body.match(/<link>/g).length.should.eql(2);
                });
        });

        it('serve /podcast/', function () {
            const req = {
                method: 'GET',
                url: '/podcast/',
                host: 'example.com'
            };

            return localUtils.mockExpress.invoke(app, req)
                .then(function (response) {
                    const $ = cheerio.load(response.body);
                    response.statusCode.should.eql(200);
                    $('head link')[1].attribs.href.should.eql('http://127.0.0.1:2369/rss/');
                });
        });
    });
});
