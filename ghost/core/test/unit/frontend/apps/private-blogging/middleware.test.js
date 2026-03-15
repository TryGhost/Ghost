const assert = require('node:assert/strict');
const errors = require('@tryghost/errors');
const sinon = require('sinon');
const crypto = require('crypto');
const fs = require('fs-extra');
const {assertExists} = require('../../../../utils/assertions');
const settingsCache = require('../../../../../core/shared/settings-cache');
const config = require('../../../../../core/shared/config');
const privateBlogging = require('../../../../../core/frontend/apps/private-blogging/lib/middleware');

function hash(password, salt) {
    const hasher = crypto.createHash('sha256');
    hasher.update(password + salt, 'utf8');
    return hasher.digest('hex');
}

describe('Private Blogging', function () {
    let settingsStub;
    let req;
    let res;
    let next;

    afterEach(function () {
        sinon.restore();
    });

    beforeEach(function () {
        req = {
            query: {}
        };
        res = {};
        settingsStub = sinon.stub(settingsCache, 'get');
        next = sinon.spy();
    });

    describe('checkIsPrivate (set state from settings)', function () {
        it('Sets res.isPrivateBlog false if setting is false', function () {
            settingsStub.withArgs('is_private').returns(false);

            privateBlogging.checkIsPrivate(req, res, next);
            sinon.assert.called(next);
            assert.equal(res.isPrivateBlog, false);
        });

        it('Sets res.isPrivateBlog true if setting is true', function () {
            settingsStub.withArgs('is_private').returns(true);

            privateBlogging.checkIsPrivate(req, res, next);
            sinon.assert.called(next);
            assert.equal(res.isPrivateBlog, true);
        });
    });

    // The remainder of these tests set res.isPrivateBlog true or false directly
    describe('Private Mode Disabled', function () {
        beforeEach(function () {
            res.isPrivateBlog = false;
        });

        it('filterPrivateRoutes should call next', function () {
            privateBlogging.filterPrivateRoutes(req, res, next);
            sinon.assert.called(next);
        });

        it('redirectPrivateToHomeIfLoggedIn should redirect to home', function () {
            res = {
                redirect: sinon.spy(),
                isPrivateBlog: false
            };
            privateBlogging.redirectPrivateToHomeIfLoggedIn(req, res, next);
            sinon.assert.called(res.redirect);
            sinon.assert.calledWith(res.redirect, `${config.get('url')}/`);
        });

        it('handle404 should still 404', function () {
            privateBlogging.handle404(new errors.NotFoundError(), req, res, next);
            sinon.assert.called(next);
            assert.equal((next.firstCall.args[0] instanceof errors.NotFoundError), true);
        });
    });

    describe('Private Mode Enabled', function () {
        beforeEach(function () {
            res = {
                status: function () {
                    return this;
                },
                send: function () {
                },
                set: function () {
                },
                redirect: sinon.spy(),
                isPrivateBlog: true
            };

            // Set global settings for private mode
            settingsStub.withArgs('is_private').returns(true);
            settingsStub.withArgs('password').returns('rightpassword');
            settingsStub.withArgs('public_hash').returns('777aaa');

            // Ensure we have an empty session (not logged in)
            req.session = {};
        });

        describe('Logged Out behavior', function () {
            it('authenticatePrivateSession should redirect', function () {
                req.path = req.url = '/welcome/';
                privateBlogging.authenticatePrivateSession(req, res, next);
                sinon.assert.notCalled(next);
                sinon.assert.called(res.redirect);
                sinon.assert.calledWith(res.redirect, '/private/?r=%2Fwelcome%2F');
            });

            it('handle404 should redirect', function () {
                req.path = req.url = '/welcome/';
                privateBlogging.handle404(new errors.NotFoundError(), req, res, next);
                sinon.assert.notCalled(next);
                sinon.assert.called(res.redirect);
                sinon.assert.calledWith(res.redirect, '/private/?r=%2Fwelcome%2F');
            });

            describe('Site privacy managed by filterPrivateRoutes', function () {
                it('should call next for the /private/ route', function () {
                    req.path = req.url = '/private/';
                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.called(next);
                });

                it('should redirect to /private/ for private route with extra path', function () {
                    req.path = req.url = '/private/welcome/';

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.calledOnce(res.redirect);
                    sinon.assert.calledWith(res.redirect, '/private/?r=%2Fprivate%2Fwelcome%2F');
                });

                it('should redirect to /private/ for sitemap', function () {
                    req.path = req.url = '/sitemap.xml';

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.calledOnce(res.redirect);
                    sinon.assert.calledWith(res.redirect, '/private/?r=%2Fsitemap.xml');
                });

                it('should redirect to /private/ for sitemap with params', function () {
                    req.url = '/sitemap.xml?weird=param';
                    req.path = '/sitemap.xml';

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.calledOnce(res.redirect);
                    sinon.assert.calledWith(res.redirect, '/private/?r=%2Fsitemap.xml%3Fweird%3Dparam');
                });

                it('should redirect to /private/ for /rss/', function () {
                    req.path = req.url = '/rss/';

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.calledOnce(res.redirect);
                    sinon.assert.calledWith(res.redirect, '/private/?r=%2Frss%2F');
                });

                it('should redirect to /private/ for author rss', function () {
                    req.path = req.url = '/author/halfdan/rss/';

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.calledOnce(res.redirect);
                    sinon.assert.calledWith(res.redirect, '/private/?r=%2Fauthor%2Fhalfdan%2Frss%2F');
                });

                it('should redirect to /private/ for tag rss', function () {
                    req.path = req.url = '/tag/slimer/rss/';

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.calledOnce(res.redirect);
                    sinon.assert.calledWith(res.redirect, '/private/?r=%2Ftag%2Fslimer%2Frss%2F');
                });

                it('should redirect to /private/ for rss with extra path', function () {
                    req.path = req.url = '/rss/sometag';

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.calledOnce(res.redirect);
                    sinon.assert.calledWith(res.redirect, '/private/?r=%2Frss%2Fsometag');
                });

                it('should render custom robots.txt', function () {
                    // Note this test doesn't cover the full site behavior,
                    // another robots.txt can be incorrectly served if middleware is out of order
                    req.url = req.path = '/robots.txt';
                    res.writeHead = sinon.spy();
                    res.end = sinon.spy();
                    sinon.stub(fs, 'readFile').callsFake(function (file, cb) {
                        cb(null, 'User-agent: * Disallow: /');
                    });
                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.called(res.writeHead);
                    sinon.assert.called(res.end);
                });

                it('should allow private /rss/ feed', function () {
                    req.url = req.originalUrl = req.path = '/777aaa/rss/';
                    req.params = {};

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.called(next);
                    assert.equal(req.url, '/rss/');
                });

                it('should allow private tag /rss/ feed', function () {
                    req.url = req.originalUrl = req.path = '/tag/getting-started/777aaa/rss/';
                    req.params = {};

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.called(next);
                    assert.equal(req.url, '/tag/getting-started/rss/');
                });

                it('should redirect to /private/ for private rss with extra path', function () {
                    req.url = req.originalUrl = req.path = '/777aaa/rss/hackme/';

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.calledOnce(res.redirect);
                    sinon.assert.calledWith(res.redirect, '/private/?r=%2F777aaa%2Frss%2Fhackme%2F');
                });
            });

            describe('/private/ route', function () {
                it('redirectPrivateToHomeIfLoggedIn should allow /private/ to be rendered', function () {
                    privateBlogging.redirectPrivateToHomeIfLoggedIn(req, res, next);
                    sinon.assert.called(next);
                });
            });
        });

        describe('Logging in (doLoginToPrivateSite)', function () {
            it('doLoginToPrivateSite should call next if error', function () {
                res.error = 'Test Error';
                privateBlogging.doLoginToPrivateSite(req, res, next);
                sinon.assert.called(next);
            });

            it('doLoginToPrivateSite should return next if password is incorrect', function () {
                req.body = {password: 'wrongpassword'};

                privateBlogging.doLoginToPrivateSite(req, res, next);
                assertExists(res.error);
                sinon.assert.called(next);
            });

            it('doLoginToPrivateSite should redirect if password is correct', function () {
                req.body = {password: 'rightpassword'};
                req.session = {};
                res.redirect = sinon.spy();

                privateBlogging.doLoginToPrivateSite(req, res, next);
                sinon.assert.called(res.redirect);
            });

            it('doLoginToPrivateSite should redirect to "/" if r param is a full url', function () {
                req.body = {password: 'rightpassword'};
                req.session = {};
                req.query = {
                    r: encodeURIComponent('http://britney.com')
                };
                res.redirect = sinon.spy();

                privateBlogging.doLoginToPrivateSite(req, res, next);
                sinon.assert.called(res.redirect);
                assert.equal(res.redirect.args[0][0], '/');
            });

            it('doLoginToPrivateSite should redirect to the relative path if r param is there', function () {
                req.body = {password: 'rightpassword'};
                req.session = {};
                req.query = {
                    r: encodeURIComponent('/test')
                };
                res.redirect = sinon.spy();

                privateBlogging.doLoginToPrivateSite(req, res, next);
                sinon.assert.called(res.redirect);
                assert.equal(res.redirect.args[0][0], '/test');
            });

            it('doLoginToPrivateSite should preserve query string including UTM parameters', function () {
                req.body = {password: 'rightpassword'};
                req.session = {};
                req.query = {
                    r: encodeURIComponent('/?utm_source=twitter&utm_campaign=test')
                };
                res.redirect = sinon.spy();

                privateBlogging.doLoginToPrivateSite(req, res, next);
                sinon.assert.called(res.redirect);
                assert.equal(res.redirect.args[0][0], '/?utm_source=twitter&utm_campaign=test');
            });

            it('doLoginToPrivateSite should preserve query string on paths', function () {
                req.body = {password: 'rightpassword'};
                req.session = {};
                req.query = {
                    r: encodeURIComponent('/welcome/?ref=newsletter&utm_medium=email')
                };
                res.redirect = sinon.spy();

                privateBlogging.doLoginToPrivateSite(req, res, next);
                sinon.assert.called(res.redirect);
                assert.equal(res.redirect.args[0][0], '/welcome/?ref=newsletter&utm_medium=email');
            });

            it('doLoginToPrivateSite should redirect to "/" if r param is redirecting to another domain than the current instance', function () {
                req.body = {password: 'rightpassword'};
                req.session = {};
                req.query = {
                    r: encodeURIComponent('http://britney.com//example.com')
                };
                res.redirect = sinon.spy();

                privateBlogging.doLoginToPrivateSite(req, res, next);
                sinon.assert.called(res.redirect);
                assert.equal(res.redirect.args[0][0], '/');
            });

            describe('Bad Password', function () {
                beforeEach(function () {
                    req.session = {
                        token: 'wrongpassword',
                        salt: Date.now().toString()
                    };
                });
                it('redirectPrivateToHomeIfLoggedIn should return next', function () {
                    privateBlogging.redirectPrivateToHomeIfLoggedIn(req, res, next);
                    sinon.assert.called(next);
                });

                it('authenticatePrivateSession should redirect', function () {
                    req.url = '/welcome';

                    privateBlogging.authenticatePrivateSession(req, res, next);
                    sinon.assert.called(res.redirect);
                    sinon.assert.calledWith(res.redirect, '/private/?r=%2Fwelcome');
                });
            });
        });

        describe('Logged In behavior', function () {
            beforeEach(function () {
                const salt = Date.now().toString();

                req.session = {
                    token: hash('rightpassword', salt),
                    salt
                };
            });

            it('authenticatePrivateSession should return next', function () {
                privateBlogging.authenticatePrivateSession(req, res, next);
                sinon.assert.called(next);
            });

            it('handle404 should still 404', function () {
                privateBlogging.handle404(new errors.NotFoundError(), req, res, next);
                sinon.assert.called(next);
                assert.equal((next.firstCall.args[0] instanceof errors.NotFoundError), true);
            });

            describe('Site privacy managed by filterPrivateRoutes', function () {
                it('should 404 for standard public /rss/ requests', function () {
                    req.url = req.path = '/rss/';

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.called(next);
                    assert.equal((next.firstCall.args[0] instanceof errors.NotFoundError), true);
                });

                it('should 404 for standard public tag rss requests', function () {
                    req.url = req.path = '/tag/welcome/rss/';

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.called(next);
                    assert.equal((next.firstCall.args[0] instanceof errors.NotFoundError), true);
                });

                it('should allow a tag to contain the word rss', function () {
                    req.url = req.path = '/tag/rss-test/';

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.called(next);
                    assert.equal(next.firstCall.args.length, 0);
                });

                it('should not 404 for very short post url', function () {
                    req.url = req.path = '/ab/';

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.called(next);
                    assert.equal(next.firstCall.args.length, 0);
                });

                it('should allow private /rss/ feed', function () {
                    req.url = req.originalUrl = req.path = '/777aaa/rss/';
                    req.params = {};

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.called(next);
                    assert.equal(req.url, '/rss/');
                });

                it('should allow private tag /rss/ feed', function () {
                    req.url = req.originalUrl = req.path = '/tag/getting-started/777aaa/rss/';
                    req.params = {};

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    sinon.assert.called(next);
                    assert.equal(req.url, '/tag/getting-started/rss/');
                });
            });

            describe('/private/ route', function () {
                it('redirectPrivateToHomeIfLoggedIn should redirect to home', function () {
                    privateBlogging.redirectPrivateToHomeIfLoggedIn(req, res, next);
                    sinon.assert.called(res.redirect);
                });
            });
        });
    });
});
