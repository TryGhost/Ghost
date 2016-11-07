var passport = require('passport'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    rewire = require('rewire'),
    should = require('should'),
    sandbox = sinon.sandbox.create(),
    testUtils = require('../../utils'),
    GhostPassport = rewire('../../../server/auth/passport'),
    models = require('../../../server/models'),
    utils = require('../../../server/utils'),
    errors = require('../../../server/errors');

should.equal(true, true);

describe('Ghost Passport', function () {
    var client;

    function FakeGhostOAuth2Strategy(options) {
        this.name = 'FakeGhostOAuth2Strategy';

        should.exist(options.blogUri);
        should.exist(options.url);
        should.exist(options.callbackURL);
        options.passReqToCallback.should.eql(true);
    }

    before(function () {
        models.init();
        GhostPassport.__set__('GhostOAuth2Strategy', FakeGhostOAuth2Strategy);
        GhostPassport.__set__('_private.retryTimeout', 50);
    });

    beforeEach(function () {
        sandbox.spy(passport, 'use');

        sandbox.stub(models.Client, 'findOne', function () {
            return Promise.resolve(client);
        });

        sandbox.stub(models.Client, 'add').returns(Promise.resolve(new models.Client(testUtils.DataGenerator.forKnex.createClient())));

        FakeGhostOAuth2Strategy.prototype.setClient = sandbox.stub();
        FakeGhostOAuth2Strategy.prototype.registerClient = sandbox.stub().returns(Promise.resolve({}));
        FakeGhostOAuth2Strategy.prototype.updateClient = sandbox.stub().returns(Promise.resolve({}));
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('auth_type: password', function () {
        it('initialise passport with passport auth type', function () {
            return GhostPassport.init({
                authType: 'passport'
            }).then(function (response) {
                should.exist(response.passport);
                passport.use.callCount.should.eql(2);

                models.Client.findOne.called.should.eql(false);
                models.Client.add.called.should.eql(false);
                FakeGhostOAuth2Strategy.prototype.setClient.called.should.eql(false);
                FakeGhostOAuth2Strategy.prototype.registerClient.called.should.eql(false);
                FakeGhostOAuth2Strategy.prototype.updateClient.called.should.eql(false);
            });
        });
    });

    describe('auth_type: ghost', function () {
        it('ghost client is already present in database and redirect_uri hasn\'t changed', function () {
            client = new models.Client(testUtils.DataGenerator.forKnex.createClient({
                redirection_uri: utils.url.getBaseUrl()
            }));

            return GhostPassport.init({
                authType: 'ghost',
                blogUri: 'http://my-blog.com',
                ghostAuthUrl: 'http://devauth.ghost.org',
                redirectUri: utils.url.getBaseUrl()
            }).then(function (response) {
                should.exist(response.passport);
                passport.use.callCount.should.eql(3);

                models.Client.findOne.called.should.eql(true);
                models.Client.add.called.should.eql(false);
                FakeGhostOAuth2Strategy.prototype.setClient.called.should.eql(true);
                FakeGhostOAuth2Strategy.prototype.registerClient.called.should.eql(false);
                FakeGhostOAuth2Strategy.prototype.updateClient.called.should.eql(false);
            });
        });

        it('ghost client is already present in database and redirect_uri has changed', function () {
            client = new models.Client(testUtils.DataGenerator.forKnex.createClient({
                redirection_uri: 'URL-HAS-CHANGED'
            }));

            return GhostPassport.init({
                authType: 'ghost',
                blogUri: 'http://my-blog.com',
                ghostAuthUrl: 'http://devauth.ghost.org',
                redirectUri: utils.url.getBaseUrl()
            }).then(function (response) {
                should.exist(response.passport);
                passport.use.callCount.should.eql(3);

                models.Client.findOne.called.should.eql(true);
                models.Client.add.called.should.eql(false);
                FakeGhostOAuth2Strategy.prototype.setClient.called.should.eql(true);
                FakeGhostOAuth2Strategy.prototype.registerClient.called.should.eql(false);
                FakeGhostOAuth2Strategy.prototype.updateClient.called.should.eql(true);
            });
        });

        it('ghost client does not exist', function () {
            client = null;

            return GhostPassport.init({
                authType: 'ghost',
                blogUri: 'http://my-blog.com',
                ghostAuthUrl: 'http://devauth.ghost.org',
                redirectUri: utils.url.getBaseUrl()
            }).then(function (response) {
                should.exist(response.passport);
                passport.use.callCount.should.eql(3);

                models.Client.findOne.called.should.eql(true);
                models.Client.add.called.should.eql(true);
                FakeGhostOAuth2Strategy.prototype.setClient.called.should.eql(true);
                FakeGhostOAuth2Strategy.prototype.registerClient.called.should.eql(true);
            });
        });

        it('ghost client does not exist, ghost.org register client does not work', function () {
            client = null;

            FakeGhostOAuth2Strategy.prototype.registerClient.returns(Promise.reject(new Error('cannot connect to ghost.org')));

            return GhostPassport.init({
                authType: 'ghost',
                blogUri: 'http://my-blog.com',
                ghostAuthUrl: 'http://devauth.ghost.org',
                redirectUri: utils.url.getBaseUrl()
            }).catch(function (err) {
                (err instanceof errors.IncorrectUsageError).should.eql(true);
                FakeGhostOAuth2Strategy.prototype.registerClient.callCount.should.eql(12);
            });
        });
    });
});
