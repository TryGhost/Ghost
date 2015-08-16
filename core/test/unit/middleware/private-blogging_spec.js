/*globals describe, beforeEach, afterEach, it*/
/*jshint expr:true*/
var crypto          = require('crypto'),
    should          = require('should'),
    sinon           = require('sinon'),
    Promise         = require('bluebird'),
    privateBlogging = require('../../../server/middleware/private-blogging'),
    api             = require('../../../server/api'),
    errors          = require('../../../server/errors'),
    fs              = require('fs');

should.equal(true, true);

function hash(password, salt) {
    var hasher = crypto.createHash('sha256');

    hasher.update(password + salt, 'utf8');

    return hasher.digest('hex');
}

describe('Private Blogging', function () {
    var sandbox,
        apiSettingsStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('passProtect', function () {
        var req, res, next;

        beforeEach(function () {
            req = {}, res = {};
            apiSettingsStub = sandbox.stub(api.settings, 'read');
            next = sinon.spy();
        });

        it('checkIsPrivate should call next if not private', function (done) {
            apiSettingsStub.withArgs(sinon.match.has('key', 'isPrivate')).returns(Promise.resolve({
                settings: [{
                    key: 'isPrivate',
                    value: 'false'
                }]
            }));

            privateBlogging.checkIsPrivate(req, res, next).then(function () {
                next.called.should.be.true;
                res.isPrivateBlog.should.be.false;

                done();
            }).catch(done);
        });

        it('checkIsPrivate should load session if private', function (done) {
            apiSettingsStub.withArgs(sinon.match.has('key', 'isPrivate')).returns(Promise.resolve({
                settings: [{
                    key: 'isPrivate',
                    value: 'true'
                }]
            }));

            privateBlogging.checkIsPrivate(req, res, next).then(function () {
                res.isPrivateBlog.should.be.true;

                done();
            }).catch(done);
        });

        describe('not private', function () {
            beforeEach(function () {
                res.isPrivateBlog = false;
            });

            it('filterPrivateRoutes should call next if not private', function () {
                privateBlogging.filterPrivateRoutes(req, res, next);
                next.called.should.be.true;
            });

            it('isPrivateSessionAuth should redirect if blog is not private', function () {
                res = {
                    redirect: sinon.spy(),
                    isPrivateBlog: false
                };
                privateBlogging.isPrivateSessionAuth(req, res, next);
                res.redirect.called.should.be.true;
            });
        });

        describe('private', function () {
            var errorSpy;

            beforeEach(function () {
                res.isPrivateBlog = true;
                errorSpy = sandbox.spy(errors, 'error404');
                res = {
                    status: function () {
                        return this;
                    },
                    send: function () {},
                    set: function () {},
                    isPrivateBlog: true
                };
            });

            it('filterPrivateRoutes should call next if admin', function () {
                res.isAdmin = true;
                privateBlogging.filterPrivateRoutes(req, res, next);
                next.called.should.be.true;
            });

            it('filterPrivateRoutes should call next if is the "private" route', function () {
                req.url = '/private/';
                privateBlogging.filterPrivateRoutes(req, res, next);
                next.called.should.be.true;
            });

            it('filterPrivateRoutes should throw 404 if url is sitemap', function () {
                req.url = '/sitemap.xml';
                privateBlogging.filterPrivateRoutes(req, res, next);
                errorSpy.called.should.be.true;
            });

            it('filterPrivateRoutes should throw 404 if url is rss', function () {
                req.url = '/rss';
                privateBlogging.filterPrivateRoutes(req, res, next);
                errorSpy.called.should.be.true;
            });

            it('filterPrivateRoutes should throw 404 if url is rss plus something', function () {
                req.url = '/rss/sometag';
                privateBlogging.filterPrivateRoutes(req, res, next);
                errorSpy.called.should.be.true;
            });

            it('filterPrivateRoutes should render custom robots.txt', function () {
                req.url = '/robots.txt';
                res.writeHead = sinon.spy();
                res.end = sinon.spy();
                sandbox.stub(fs, 'readFile', function (file, cb) {
                    cb(null, 'User-agent: * Disallow: /');
                });
                privateBlogging.filterPrivateRoutes(req, res, next);
                res.writeHead.called.should.be.true;
                res.end.called.should.be.true;
            });

            it('authenticateProtection should call next if error', function () {
                res.error = 'Test Error';
                privateBlogging.authenticateProtection(req, res, next);
                next.called.should.be.true;
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
                        next.called.should.be.true;

                        done();
                    }).catch(done);
                });

                it('authenticatePrivateSession should redirect if hash is not verified', function (done) {
                    req.url = '/welcome-to-ghost';
                    req.session = {
                        token: 'wrongpassword',
                        salt: Date.now().toString()
                    };
                    res.redirect = sinon.spy();

                    privateBlogging.authenticatePrivateSession(req, res, next).then(function () {
                        res.redirect.called.should.be.true;

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
                        res.redirect.called.should.be.true;

                        done();
                    }).catch(done);
                });

                it('isPrivateSessionAuth should return next if hash is not verified', function (done) {
                    req.session = {
                        token: 'wrongpassword',
                        salt: Date.now().toString()
                    };

                    privateBlogging.isPrivateSessionAuth(req, res, next).then(function () {
                        next.called.should.be.true;

                        done();
                    }).catch(done);
                });

                it('authenticateProtection should return next if password is incorrect', function (done) {
                    req.body = {password: 'wrongpassword'};

                    privateBlogging.authenticateProtection(req, res, next).then(function () {
                        res.error.should.not.be.empty;
                        next.called.should.be.true;

                        done();
                    }).catch(done);
                });

                it('authenticateProtection should redirect if password is correct', function (done) {
                    req.body = {password: 'rightpassword'};
                    req.session = {};
                    res.redirect = sandbox.spy();

                    privateBlogging.authenticateProtection(req, res, next).then(function () {
                        res.redirect.called.should.be.true;

                        done();
                    }).catch(done);
                });
            });
        });
    });
});
