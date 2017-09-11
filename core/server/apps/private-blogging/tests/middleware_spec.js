/*globals describe, beforeEach, afterEach, it*/
var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    crypto = require('crypto'),
    Promise = require('bluebird'),
    api = require('../../../api'),
    fs = require('fs'),

    privateBlogging = require('../lib/middleware'),

    sandbox = sinon.sandbox.create();

function hash(password, salt) {
    var hasher = crypto.createHash('sha256');

    hasher.update(password + salt, 'utf8');

    return hasher.digest('hex');
}

describe('Private Blogging', function () {
    var apiSettingsStub;

    afterEach(function () {
        sandbox.restore();
    });

    describe('passProtect', function () {
        var req, res, next;

        beforeEach(function () {
            req = {};
            res = {};
            apiSettingsStub = sandbox.stub(api.settings, 'read');
            next = sandbox.spy();
        });

        it('checkIsPrivate should call next if not private', function (done) {
            apiSettingsStub.withArgs(sinon.match.has('key', 'is_private')).returns(Promise.resolve({
                settings: [{
                    key: 'is_private',
                    value: 'false'
                }]
            }));

            privateBlogging.checkIsPrivate(req, res, next).then(function () {
                next.called.should.be.true();
                res.isPrivateBlog.should.be.false();

                done();
            }).catch(done);
        });

        it('checkIsPrivate should load session if private', function (done) {
            apiSettingsStub.withArgs(sinon.match.has('key', 'is_private')).returns(Promise.resolve({
                settings: [{
                    key: 'is_private',
                    value: 'true'
                }]
            }));

            privateBlogging.checkIsPrivate(req, res, next).then(function () {
                res.isPrivateBlog.should.be.true();

                done();
            }).catch(done);
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

                return privateBlogging.filterPrivateRoutes(req, res, next)
                    .then(function () {
                        res.redirect.calledOnce.should.be.true();
                    });
            });

            it('filterPrivateRoutes: sitemap with params redirects to /private', function () {
                req.url = '/sitemap.xml?weird=param';
                req.path = '/sitemap.xml';

                return privateBlogging.filterPrivateRoutes(req, res, next)
                    .then(function () {
                        res.redirect.calledOnce.should.be.true();
                    });
            });

            it('filterPrivateRoutes: rss redirects to /private', function () {
                req.path = req.url = '/rss/';

                return privateBlogging.filterPrivateRoutes(req, res, next)
                    .then(function () {
                        res.redirect.calledOnce.should.be.true();
                    });
            });

            it('filterPrivateRoutes: author rss redirects to /private', function () {
                req.path = req.url = '/author/halfdan/rss/';

                return privateBlogging.filterPrivateRoutes(req, res, next)
                    .then(function () {
                        res.redirect.calledOnce.should.be.true();
                    });
            });

            it('filterPrivateRoutes: tag rss redirects to /private', function () {
                req.path = req.url = '/tag/slimer/rss/';

                return privateBlogging.filterPrivateRoutes(req, res, next)
                    .then(function () {
                        res.redirect.calledOnce.should.be.true();
                    });
            });

            it('filterPrivateRoutes: rss plus something redirects to /private', function () {
                req.path = req.url = '/rss/sometag';

                return privateBlogging.filterPrivateRoutes(req, res, next)
                    .then(function () {
                        res.redirect.calledOnce.should.be.true();
                    });
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
                    apiSettingsStub.withArgs(sinon.match.has('key', 'password')).returns(Promise.resolve({
                        settings: [{
                            key: 'password',
                            value: 'rightpassword'
                        }]
                    }));
                });

                it('authenticatePrivateSession should return next if hash is verified', function (done) {
                    var salt = Date.now().toString();

                    req.session = {
                        token: hash('rightpassword', salt),
                        salt: salt
                    };

                    privateBlogging.authenticatePrivateSession(req, res, next).then(function () {
                        next.called.should.be.true();

                        done();
                    }).catch(done);
                });

                it('authenticatePrivateSession should redirect if hash is not verified', function (done) {
                    req.url = '/welcome';
                    req.session = {
                        token: 'wrongpassword',
                        salt: Date.now().toString()
                    };
                    res.redirect = sandbox.spy();

                    privateBlogging.authenticatePrivateSession(req, res, next).then(function () {
                        res.redirect.called.should.be.true();

                        done();
                    }).catch(done);
                });

                it('isPrivateSessionAuth should redirect if hash is verified', function (done) {
                    var salt = Date.now().toString();

                    req.session = {
                        token: hash('rightpassword', salt),
                        salt: salt
                    };
                    res.redirect = sandbox.spy();

                    privateBlogging.isPrivateSessionAuth(req, res, next).then(function () {
                        res.redirect.called.should.be.true();

                        done();
                    }).catch(done);
                });

                it('isPrivateSessionAuth should return next if hash is not verified', function (done) {
                    req.session = {
                        token: 'wrongpassword',
                        salt: Date.now().toString()
                    };

                    privateBlogging.isPrivateSessionAuth(req, res, next).then(function () {
                        next.called.should.be.true();

                        done();
                    }).catch(done);
                });

                it('authenticateProtection should return next if password is incorrect', function (done) {
                    req.body = {password: 'wrongpassword'};

                    privateBlogging.authenticateProtection(req, res, next).then(function () {
                        res.error.should.not.be.empty();
                        next.called.should.be.true();

                        done();
                    }).catch(done);
                });

                it('authenticateProtection should redirect if password is correct', function (done) {
                    req.body = {password: 'rightpassword'};
                    req.session = {};
                    res.redirect = sandbox.spy();

                    privateBlogging.authenticateProtection(req, res, next).then(function () {
                        res.redirect.called.should.be.true();

                        done();
                    }).catch(done);
                });
            });
        });
    });
});
