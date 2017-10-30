/*globals describe, beforeEach, afterEach, it*/
var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    crypto = require('crypto'),
    fs = require('fs'),
    errors = require('../../../../server/errors'),
    settingsCache = require('../../../../server/settings/cache'),
    privateBlogging = require('../../../../server/apps/private-blogging/lib/middleware'),
    sandbox = sinon.sandbox.create();

function hash(password, salt) {
    var hasher = crypto.createHash('sha256');
    hasher.update(password + salt, 'utf8');
    return hasher.digest('hex');
}

describe('Private Blogging', function () {
    var settingsStub;

    afterEach(function () {
        sandbox.restore();
    });

    describe('passProtect', function () {
        var req, res, next;

        beforeEach(function () {
            req = {};
            res = {};
            settingsStub = sandbox.stub(settingsCache, 'get');
            next = sandbox.spy();
        });

        it('checkIsPrivate should call next if not private', function () {
            settingsStub.withArgs('is_private').returns(false);

            privateBlogging.checkIsPrivate(req, res, next);
            next.called.should.be.true();
            res.isPrivateBlog.should.be.false();
        });

        it('checkIsPrivate should load session if private', function () {
            settingsStub.withArgs('is_private').returns(true);

            privateBlogging.checkIsPrivate(req, res, next);
            res.isPrivateBlog.should.be.true();
        });

        describe('not private', function () {
            beforeEach(function () {
                res.isPrivateBlog = false;
            });

            it('filterPrivateRoutes should call next if not private', function () {
                privateBlogging.filterPrivateRoutes(req, res, next);
                next.called.should.be.true();
            });

            it('isPrivateSessionAuth should redirect if blog is not private', function () {
                res = {
                    redirect: sandbox.spy(),
                    isPrivateBlog: false
                };
                privateBlogging.isPrivateSessionAuth(req, res, next);
                res.redirect.called.should.be.true();
            });
        });

        describe('private', function () {
            beforeEach(function () {
                res = {
                    status: function () {
                        return this;
                    },
                    send: function () {
                    },
                    set: function () {
                    },
                    redirect: sandbox.spy(),
                    isPrivateBlog: true
                };

                req.session = {};
            });

            it('filterPrivateRoutes should call next if admin', function () {
                res.isAdmin = true;
                privateBlogging.filterPrivateRoutes(req, res, next);
                next.called.should.be.true();
            });

            it('filterPrivateRoutes should call next if is the "private" route', function () {
                req.path = req.url = '/private/';
                privateBlogging.filterPrivateRoutes(req, res, next);
                next.called.should.be.true();
            });

            it('filterPrivateRoutes: sitemap redirects to /private', function () {
                req.path = req.url = '/sitemap.xml';

                privateBlogging.filterPrivateRoutes(req, res, next);
                res.redirect.calledOnce.should.be.true();
            });

            it('filterPrivateRoutes: sitemap with params redirects to /private', function () {
                req.url = '/sitemap.xml?weird=param';
                req.path = '/sitemap.xml';

                privateBlogging.filterPrivateRoutes(req, res, next);
                res.redirect.calledOnce.should.be.true();
            });

            it('filterPrivateRoutes: rss redirects to /private', function () {
                req.path = req.url = '/rss/';

                privateBlogging.filterPrivateRoutes(req, res, next);
                res.redirect.calledOnce.should.be.true();
            });

            it('filterPrivateRoutes: author rss redirects to /private', function () {
                req.path = req.url = '/author/halfdan/rss/';

                privateBlogging.filterPrivateRoutes(req, res, next);
                res.redirect.calledOnce.should.be.true();
            });

            it('filterPrivateRoutes: tag rss redirects to /private', function () {
                req.path = req.url = '/tag/slimer/rss/';

                privateBlogging.filterPrivateRoutes(req, res, next);
                res.redirect.calledOnce.should.be.true();
            });

            it('filterPrivateRoutes: rss plus something redirects to /private', function () {
                req.path = req.url = '/rss/sometag';

                privateBlogging.filterPrivateRoutes(req, res, next);
                res.redirect.calledOnce.should.be.true();
            });

            it('filterPrivateRoutes should render custom robots.txt', function () {
                req.url = req.path = '/robots.txt';
                res.writeHead = sandbox.spy();
                res.end = sandbox.spy();
                sandbox.stub(fs, 'readFile', function (file, cb) {
                    cb(null, 'User-agent: * Disallow: /');
                });
                privateBlogging.filterPrivateRoutes(req, res, next);
                res.writeHead.called.should.be.true();
                res.end.called.should.be.true();
            });

            it('authenticateProtection should call next if error', function () {
                res.error = 'Test Error';
                privateBlogging.authenticateProtection(req, res, next);
                next.called.should.be.true();
            });

            describe('with hash verification', function () {
                beforeEach(function () {
                    settingsStub.withArgs('password').returns('rightpassword');
                });

                it('authenticatePrivateSession should return next if hash is verified', function () {
                    var salt = Date.now().toString();

                    req.session = {
                        token: hash('rightpassword', salt),
                        salt: salt
                    };

                    privateBlogging.authenticatePrivateSession(req, res, next);
                    next.called.should.be.true();
                });

                it('authenticatePrivateSession should redirect if hash is not verified', function () {
                    req.url = '/welcome';
                    req.session = {
                        token: 'wrongpassword',
                        salt: Date.now().toString()
                    };
                    res.redirect = sandbox.spy();

                    privateBlogging.authenticatePrivateSession(req, res, next);
                    res.redirect.called.should.be.true();
                });

                it('isPrivateSessionAuth should redirect if hash is verified', function () {
                    var salt = Date.now().toString();

                    req.session = {
                        token: hash('rightpassword', salt),
                        salt: salt
                    };
                    res.redirect = sandbox.spy();

                    privateBlogging.isPrivateSessionAuth(req, res, next);
                    res.redirect.called.should.be.true();
                });

                it('isPrivateSessionAuth should return next if hash is not verified', function () {
                    req.session = {
                        token: 'wrongpassword',
                        salt: Date.now().toString()
                    };

                    privateBlogging.isPrivateSessionAuth(req, res, next);
                    next.called.should.be.true();
                });

                it('authenticateProtection should return next if password is incorrect', function () {
                    req.body = {password: 'wrongpassword'};

                    privateBlogging.authenticateProtection(req, res, next);
                    res.error.should.not.be.empty();
                    next.called.should.be.true();
                });

                it('authenticateProtection should redirect if password is correct', function () {
                    req.body = {password: 'rightpassword'};
                    req.session = {};
                    res.redirect = sandbox.spy();

                    privateBlogging.authenticateProtection(req, res, next);
                    res.redirect.called.should.be.true();
                });

                it('filterPrivateRoutes should 404 for /rss/ requests', function () {
                    var salt = Date.now().toString();
                    req.url = req.path = '/rss/';

                    req.session = {
                        token: hash('rightpassword', salt),
                        salt: salt
                    };

                    res.isPrivateBlog = true;
                    res.redirect = sandbox.spy();

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    next.called.should.be.true();
                    (next.firstCall.args[0] instanceof errors.NotFoundError).should.eql(true);
                });

                it('filterPrivateRoutes should 404 for /rss requests', function () {
                    var salt = Date.now().toString();
                    req.url = req.path = '/rss';

                    req.session = {
                        token: hash('rightpassword', salt),
                        salt: salt
                    };

                    res.isPrivateBlog = true;
                    res.redirect = sandbox.spy();

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    next.called.should.be.true();
                    (next.firstCall.args[0] instanceof errors.NotFoundError).should.eql(true);
                });

                it('filterPrivateRoutes should 404 for tag rss requests', function () {
                    var salt = Date.now().toString();
                    req.url = req.path = '/tag/welcome/rss/';

                    req.session = {
                        token: hash('rightpassword', salt),
                        salt: salt
                    };

                    res.isPrivateBlog = true;
                    res.redirect = sandbox.spy();

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    next.called.should.be.true();
                    (next.firstCall.args[0] instanceof errors.NotFoundError).should.eql(true);
                });

                it('filterPrivateRoutes: allow private /rss/ feed', function () {
                    settingsStub.withArgs('public_hash').returns('777aaa');

                    req.url = req.originalUrl = req.path = '/777aaa/rss/';
                    req.params = {};

                    res.isPrivateBlog = true;
                    res.locals = {};

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    next.called.should.be.true();
                    req.url.should.eql('/rss/');
                });

                it('filterPrivateRoutes: allow private /rss feed', function () {
                    settingsStub.withArgs('public_hash').returns('777aaa');

                    req.url = req.originalUrl = req.path = '/777aaa/rss';
                    req.params = {};

                    res.isPrivateBlog = true;
                    res.locals = {};

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    next.called.should.be.true();
                    req.url.should.eql('/rss');
                });

                it('filterPrivateRoutes: allow private rss feed e.g. tags', function () {
                    settingsStub.withArgs('public_hash').returns('777aaa');

                    req.url = req.originalUrl = req.path = '/tag/getting-started/777aaa/rss/';
                    req.params = {};

                    res.isPrivateBlog = true;
                    res.locals = {};

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    next.called.should.be.true();
                    req.url.should.eql('/tag/getting-started/rss/');
                });

                it('[failure] filterPrivateRoutes: allow private rss feed e.g. tags', function () {
                    settingsStub.withArgs('public_hash').returns('777aaa');

                    req.url = req.originalUrl = req.path = '/tag/getting-started/rss/';
                    req.params = {};

                    res.isPrivateBlog = true;
                    res.locals = {};

                    res.redirect = sandbox.spy();

                    privateBlogging.filterPrivateRoutes(req, res, next);
                    res.redirect.called.should.be.true();
                });
            });
        });
    });
});
