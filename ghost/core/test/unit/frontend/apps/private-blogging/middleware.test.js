const assert = require('node:assert/strict');
const errors = require('@tryghost/errors');
const express = require('express');
const request = require('supertest');
const sinon = require('sinon');
const settingsCache = require('../../../../../core/shared/settings-cache');
const config = require('../../../../../core/shared/config');
const privateBlogging = require('../../../../../core/frontend/apps/private-blogging/lib/middleware');

function errorHandler(err, req, res, next) {
    void req;
    void next;

    res.status(err.statusCode || 500).json({
        error: {
            message: err.message,
            statusCode: err.statusCode
        }
    });
}

function finalHandler(req, res) {
    res.json({
        ok: true,
        isPrivateBlog: res.isPrivateBlog,
        url: req.url,
        path: req.path,
        originalUrl: req.originalUrl,
        error: res.error
    });
}

function createApp(middlewares, {withLogin = false, withBadSession = false} = {}) {
    const app = express();

    app.use(express.urlencoded({extended: false}));
    app.use(privateBlogging.checkIsPrivate);

    if (withLogin) {
        app.post('/private/', privateBlogging.doLoginToPrivateSite, finalHandler);
    }

    if (withBadSession) {
        app.get('/_test/bad-session/', (req, res) => {
            req.session.token = 'wrongpassword';
            req.session.salt = Date.now().toString();
            res.sendStatus(204);
        });
    }

    for (const middleware of middlewares) {
        app.use(middleware);
    }

    app.use(finalHandler);
    app.use(errorHandler);

    return app;
}

function create404App({withLogin = false} = {}) {
    const app = express();

    app.use(express.urlencoded({extended: false}));
    app.use(privateBlogging.checkIsPrivate);

    if (withLogin) {
        app.post('/private/', privateBlogging.doLoginToPrivateSite, finalHandler);
    }

    app.use((req, res, next) => {
        void req;
        void res;

        next(new errors.NotFoundError());
    });
    app.use(privateBlogging.handle404);
    app.use(errorHandler);

    return app;
}

async function login(agent) {
    await agent
        .post('/private/')
        .type('form')
        .send({password: 'rightpassword'})
        .expect(302);
}

describe('Private Blogging', function () {
    let settingsStub;

    afterEach(function () {
        sinon.restore();
    });

    beforeEach(function () {
        settingsStub = sinon.stub(settingsCache, 'get').callsFake((key) => {
            if (key === 'is_private') {
                return true;
            }

            if (key === 'password') {
                return 'rightpassword';
            }

            if (key === 'public_hash') {
                return '777aaa';
            }
        });
    });

    describe('checkIsPrivate (set state from settings)', function () {
        it('Sets res.isPrivateBlog false if setting is false', async function () {
            settingsStub.withArgs('is_private').returns(false);

            await request(createApp([]))
                .get('/')
                .expect(200)
                .expect(({body}) => {
                    assert.equal(body.isPrivateBlog, false);
                });
        });

        it('Sets res.isPrivateBlog true if setting is true', async function () {
            await request(createApp([]))
                .get('/')
                .expect(200)
                .expect(({body}) => {
                    assert.equal(body.isPrivateBlog, true);
                });
        });
    });

    describe('Private Mode Disabled', function () {
        beforeEach(function () {
            settingsStub.withArgs('is_private').returns(false);
        });

        it('filterPrivateRoutes should call next', async function () {
            await request(createApp([privateBlogging.filterPrivateRoutes]))
                .get('/')
                .expect(200)
                .expect(({body}) => {
                    assert.equal(body.ok, true);
                    assert.equal(body.isPrivateBlog, false);
                });
        });

        it('redirectPrivateToHomeIfLoggedIn should redirect to home', async function () {
            await request(createApp([privateBlogging.redirectPrivateToHomeIfLoggedIn]))
                .get('/private/')
                .expect(302)
                .expect('Location', `${config.get('url')}/`);
        });

        it('handle404 should still 404', async function () {
            await request(create404App())
                .get('/welcome/')
                .expect(404)
                .expect(({body}) => {
                    assert.equal(body.error.statusCode, 404);
                });
        });
    });

    describe('Private Mode Enabled', function () {
        describe('Logged Out behavior', function () {
            it('authenticatePrivateSession should redirect', async function () {
                await request(createApp([privateBlogging.authenticatePrivateSession]))
                    .get('/welcome/')
                    .expect(302)
                    .expect('Location', '/private/?r=%2Fwelcome%2F');
            });

            it('handle404 should redirect', async function () {
                await request(create404App())
                    .get('/welcome/')
                    .expect(302)
                    .expect('Location', '/private/?r=%2Fwelcome%2F');
            });

            describe('Site privacy managed by filterPrivateRoutes', function () {
                it('should call next for the /private/ route', async function () {
                    await request(createApp([privateBlogging.filterPrivateRoutes]))
                        .get('/private/')
                        .expect(200);
                });

                it('should redirect to /private/ for private route with extra path', async function () {
                    await request(createApp([privateBlogging.filterPrivateRoutes]))
                        .get('/private/welcome/')
                        .expect(302)
                        .expect('Location', '/private/?r=%2Fprivate%2Fwelcome%2F');
                });

                it('should redirect to /private/ for sitemap', async function () {
                    await request(createApp([privateBlogging.filterPrivateRoutes]))
                        .get('/sitemap.xml')
                        .expect(302)
                        .expect('Location', '/private/?r=%2Fsitemap.xml');
                });

                it('should redirect to /private/ for sitemap with params', async function () {
                    await request(createApp([privateBlogging.filterPrivateRoutes]))
                        .get('/sitemap.xml?weird=param')
                        .expect(302)
                        .expect('Location', '/private/?r=%2Fsitemap.xml%3Fweird%3Dparam');
                });

                it('should redirect to /private/ for /rss/', async function () {
                    await request(createApp([privateBlogging.filterPrivateRoutes]))
                        .get('/rss/')
                        .expect(302)
                        .expect('Location', '/private/?r=%2Frss%2F');
                });

                it('should redirect to /private/ for author rss', async function () {
                    await request(createApp([privateBlogging.filterPrivateRoutes]))
                        .get('/author/halfdan/rss/')
                        .expect(302)
                        .expect('Location', '/private/?r=%2Fauthor%2Fhalfdan%2Frss%2F');
                });

                it('should redirect to /private/ for tag rss', async function () {
                    await request(createApp([privateBlogging.filterPrivateRoutes]))
                        .get('/tag/slimer/rss/')
                        .expect(302)
                        .expect('Location', '/private/?r=%2Ftag%2Fslimer%2Frss%2F');
                });

                it('should redirect to /private/ for rss with extra path', async function () {
                    await request(createApp([privateBlogging.filterPrivateRoutes]))
                        .get('/rss/sometag')
                        .expect(302)
                        .expect('Location', '/private/?r=%2Frss%2Fsometag');
                });

                it('should render custom robots.txt', async function () {
                    await request(createApp([privateBlogging.filterPrivateRoutes]))
                        .get('/robots.txt')
                        .expect(200)
                        .expect('Content-Type', /text\/plain/)
                        .expect('User-agent: *\nDisallow: /');
                });

                it('should allow private /rss/ feed', async function () {
                    await request(createApp([privateBlogging.filterPrivateRoutes]))
                        .get('/777aaa/rss/')
                        .expect(200)
                        .expect(({body}) => {
                            assert.equal(body.url, '/rss/');
                        });
                });

                it('should allow private tag /rss/ feed', async function () {
                    await request(createApp([privateBlogging.filterPrivateRoutes]))
                        .get('/tag/getting-started/777aaa/rss/')
                        .expect(200)
                        .expect(({body}) => {
                            assert.equal(body.url, '/tag/getting-started/rss/');
                        });
                });

                it('should redirect to /private/ for private rss with extra path', async function () {
                    await request(createApp([privateBlogging.filterPrivateRoutes]))
                        .get('/777aaa/rss/hackme/')
                        .expect(302)
                        .expect('Location', '/private/?r=%2F777aaa%2Frss%2Fhackme%2F');
                });
            });

            describe('/private/ route', function () {
                it('redirectPrivateToHomeIfLoggedIn should allow /private/ to be rendered', async function () {
                    await request(createApp([privateBlogging.redirectPrivateToHomeIfLoggedIn]))
                        .get('/private/')
                        .expect(200);
                });
            });
        });

        describe('Logging in (doLoginToPrivateSite)', function () {
            it('doLoginToPrivateSite should call next if error', async function () {
                const app = createApp([(req, res, next) => {
                    void req;

                    res.error = 'Test Error';
                    next();
                }, privateBlogging.doLoginToPrivateSite]);

                await request(app)
                    .post('/private/')
                    .type('form')
                    .send({password: 'rightpassword'})
                    .expect(200)
                    .expect(({body}) => {
                        assert.equal(body.error, 'Test Error');
                    });
            });

            it('doLoginToPrivateSite should return next if password is incorrect', async function () {
                await request(createApp([privateBlogging.doLoginToPrivateSite]))
                    .post('/private/')
                    .type('form')
                    .send({password: 'wrongpassword'})
                    .expect(200)
                    .expect(({body}) => {
                        assert.equal(body.error.message, 'Incorrect password.');
                    });
            });

            it('doLoginToPrivateSite should redirect if password is correct', async function () {
                await request(createApp([privateBlogging.doLoginToPrivateSite]))
                    .post('/private/')
                    .type('form')
                    .send({password: 'rightpassword'})
                    .expect(302);
            });

            it('doLoginToPrivateSite should redirect to "/" if r param is a full url', async function () {
                await request(createApp([privateBlogging.doLoginToPrivateSite]))
                    .post('/private/')
                    .query({r: encodeURIComponent('http://britney.com')})
                    .type('form')
                    .send({password: 'rightpassword'})
                    .expect(302)
                    .expect('Location', '/');
            });

            it('doLoginToPrivateSite should redirect to the relative path if r param is there', async function () {
                await request(createApp([privateBlogging.doLoginToPrivateSite]))
                    .post('/private/')
                    .query({r: encodeURIComponent('/test')})
                    .type('form')
                    .send({password: 'rightpassword'})
                    .expect(302)
                    .expect('Location', '/test');
            });

            it('doLoginToPrivateSite should preserve query string including UTM parameters', async function () {
                await request(createApp([privateBlogging.doLoginToPrivateSite]))
                    .post('/private/')
                    .query({r: encodeURIComponent('/?utm_source=twitter&utm_campaign=test')})
                    .type('form')
                    .send({password: 'rightpassword'})
                    .expect(302)
                    .expect('Location', '/?utm_source=twitter&utm_campaign=test');
            });

            it('doLoginToPrivateSite should preserve query string on paths', async function () {
                await request(createApp([privateBlogging.doLoginToPrivateSite]))
                    .post('/private/')
                    .query({r: encodeURIComponent('/welcome/?ref=newsletter&utm_medium=email')})
                    .type('form')
                    .send({password: 'rightpassword'})
                    .expect(302)
                    .expect('Location', '/welcome/?ref=newsletter&utm_medium=email');
            });

            it('doLoginToPrivateSite should redirect to "/" if r param is redirecting to another domain than the current instance', async function () {
                await request(createApp([privateBlogging.doLoginToPrivateSite]))
                    .post('/private/')
                    .query({r: encodeURIComponent('http://britney.com//example.com')})
                    .type('form')
                    .send({password: 'rightpassword'})
                    .expect(302)
                    .expect('Location', '/');
            });

            describe('Bad Password', function () {
                it('redirectPrivateToHomeIfLoggedIn should return next', async function () {
                    const app = createApp([privateBlogging.redirectPrivateToHomeIfLoggedIn], {withBadSession: true});
                    const agent = request.agent(app);

                    await agent.get('/_test/bad-session/').expect(204);
                    await agent
                        .get('/private/')
                        .expect(200);
                });

                it('authenticatePrivateSession should redirect', async function () {
                    const app = createApp([privateBlogging.authenticatePrivateSession], {withBadSession: true});
                    const agent = request.agent(app);

                    await agent.get('/_test/bad-session/').expect(204);
                    await agent
                        .get('/welcome')
                        .expect(302)
                        .expect('Location', '/private/?r=%2Fwelcome');
                });
            });
        });

        describe('Logged In behavior', function () {
            it('authenticatePrivateSession should return next', async function () {
                const app = createApp([privateBlogging.authenticatePrivateSession], {withLogin: true});
                const agent = request.agent(app);

                await login(agent);
                await agent
                    .get('/')
                    .expect(200);
            });

            it('handle404 should still 404', async function () {
                const app = create404App({withLogin: true});
                const agent = request.agent(app);

                await login(agent);
                await agent
                    .get('/welcome/')
                    .expect(404)
                    .expect(({body}) => {
                        assert.equal(body.error.statusCode, 404);
                    });
            });

            describe('Site privacy managed by filterPrivateRoutes', function () {
                it('should 404 for standard public /rss/ requests', async function () {
                    const app = createApp([privateBlogging.filterPrivateRoutes], {withLogin: true});
                    const agent = request.agent(app);

                    await login(agent);
                    await agent
                        .get('/rss/')
                        .expect(404)
                        .expect(({body}) => {
                            assert.equal(body.error.statusCode, 404);
                        });
                });

                it('should 404 for standard public tag rss requests', async function () {
                    const app = createApp([privateBlogging.filterPrivateRoutes], {withLogin: true});
                    const agent = request.agent(app);

                    await login(agent);
                    await agent
                        .get('/tag/welcome/rss/')
                        .expect(404)
                        .expect(({body}) => {
                            assert.equal(body.error.statusCode, 404);
                        });
                });

                it('should allow a tag to contain the word rss', async function () {
                    const app = createApp([privateBlogging.filterPrivateRoutes], {withLogin: true});
                    const agent = request.agent(app);

                    await login(agent);
                    await agent
                        .get('/tag/rss-test/')
                        .expect(200);
                });

                it('should not 404 for very short post url', async function () {
                    const app = createApp([privateBlogging.filterPrivateRoutes], {withLogin: true});
                    const agent = request.agent(app);

                    await login(agent);
                    await agent
                        .get('/ab/')
                        .expect(200);
                });

                it('should allow private /rss/ feed', async function () {
                    const app = createApp([privateBlogging.filterPrivateRoutes], {withLogin: true});
                    const agent = request.agent(app);

                    await login(agent);
                    await agent
                        .get('/777aaa/rss/')
                        .expect(200)
                        .expect(({body}) => {
                            assert.equal(body.url, '/rss/');
                        });
                });

                it('should allow private tag /rss/ feed', async function () {
                    const app = createApp([privateBlogging.filterPrivateRoutes], {withLogin: true});
                    const agent = request.agent(app);

                    await login(agent);
                    await agent
                        .get('/tag/getting-started/777aaa/rss/')
                        .expect(200)
                        .expect(({body}) => {
                            assert.equal(body.url, '/tag/getting-started/rss/');
                        });
                });
            });

            describe('/private/ route', function () {
                it('redirectPrivateToHomeIfLoggedIn should redirect to home', async function () {
                    const app = createApp([privateBlogging.redirectPrivateToHomeIfLoggedIn], {withLogin: true});
                    const agent = request.agent(app);

                    await login(agent);
                    await agent
                        .get('/private/')
                        .expect(302)
                        .expect('Location', `${config.get('url')}/`);
                });
            });
        });
    });
});
