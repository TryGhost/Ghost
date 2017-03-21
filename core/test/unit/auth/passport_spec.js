var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    passport = require('passport'),
    Promise = require('bluebird'),
    rewire = require('rewire'),

    testUtils = require('../../utils'),
    GhostPassport = rewire('../../../server/auth/passport'),
    models = require('../../../server/models'),
    utils = require('../../../server/utils'),
    errors = require('../../../server/errors'),

    sandbox = sinon.sandbox.create();

describe('Ghost Passport', function () {
    var client, events, registeredEvents = {};

    function FakeGhostOAuth2Strategy(options) {
        this.name = 'ghost';

        should.exist(options.blogUri);
        should.exist(options.url);
        should.exist(options.redirectUri);
        options.passReqToCallback.should.eql(true);

        this.blogUri = options.blogUri;
        this.redirectUri = options.redirectUri;
    }

    before(function () {
        models.init();

        events = {
            on: function (name, onEvent) {
                registeredEvents[name] = onEvent;
            }
        };

        GhostPassport.__set__('events', events);
        GhostPassport.__set__('GhostOAuth2Strategy', FakeGhostOAuth2Strategy);
        GhostPassport.__set__('_private.retryTimeout', 50);
    });

    beforeEach(function () {
        sandbox.spy(passport, 'use');

        sandbox.stub(models.Client, 'findOne', function () {
            if (client) {
                client.save = sandbox.stub();
            }

            return Promise.resolve(client);
        });

        sandbox.stub(models.Client, 'destroy').returns(Promise.resolve());

        sandbox.stub(models.Client, 'add', function () {
            client = new models.Client(testUtils.DataGenerator.forKnex.createClient());
            return Promise.resolve(client);
        });

        FakeGhostOAuth2Strategy.prototype.setClient = sandbox.stub();
        FakeGhostOAuth2Strategy.prototype.registerClient = function () {
        };
        FakeGhostOAuth2Strategy.prototype.updateClient = function () {
        };

        sandbox.stub(FakeGhostOAuth2Strategy.prototype, 'registerClient', function (options) {
            return Promise.resolve({
                redirect_uri: this.redirectUri,
                blog_uri: this.blogUri,
                name: options.name,
                description: options.description
            });
        });

        sandbox.stub(FakeGhostOAuth2Strategy.prototype, 'updateClient', function () {
            return Promise.resolve({
                redirect_uri: client.get('redirection_uri'),
                blog_uri: client.get('blog_uri'),
                name: client.get('name'),
                description: client.get('description')
            });
        });
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

                models.Client.findOne.called.should.eql(true);
                models.Client.destroy.called.should.eql(false);
                models.Client.add.called.should.eql(false);
                FakeGhostOAuth2Strategy.prototype.setClient.called.should.eql(false);
                FakeGhostOAuth2Strategy.prototype.registerClient.called.should.eql(false);
                FakeGhostOAuth2Strategy.prototype.updateClient.called.should.eql(false);
            });
        });

        it('initialise passport with passport auth type [auth client exists]', function () {
            return models.Client.add({slug: 'ghost-auth'})
                .then(function () {
                    models.Client.add.called.should.eql(true);
                    models.Client.add.reset();

                    return GhostPassport.init({
                        authType: 'passport'
                    });
                })
                .then(function (response) {
                    should.exist(response.passport);
                    passport.use.callCount.should.eql(2);

                    models.Client.findOne.called.should.eql(true);
                    models.Client.destroy.called.should.eql(true);
                    models.Client.add.called.should.eql(false);
                    FakeGhostOAuth2Strategy.prototype.setClient.called.should.eql(false);
                    FakeGhostOAuth2Strategy.prototype.registerClient.called.should.eql(false);
                    FakeGhostOAuth2Strategy.prototype.updateClient.called.should.eql(false);
                });
        });
    });

    describe('auth_type: ghost', function () {
        it('ghost client is already present in database and nothing has changed', function () {
            client = new models.Client(testUtils.DataGenerator.forKnex.createClient({
                name: 'Ghost',
                client_uri: 'http://my-blog.com',
                redirection_uri: utils.url.urlFor('home', true)
            }));

            return GhostPassport.init({
                authType: 'ghost',
                clientUri: 'http://my-blog.com',
                ghostAuthUrl: 'http://devauth.ghost.org',
                redirectUri: utils.url.urlFor('home', true),
                clientName: 'Ghost'
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
                name: 'Ghost',
                client_uri: 'http://my-blog.com',
                redirection_uri: 'URL-HAS-CHANGED'
            }));

            return GhostPassport.init({
                authType: 'ghost',
                clientUri: 'http://my-blog.com',
                ghostAuthUrl: 'http://devauth.ghost.org',
                redirectUri: utils.url.urlFor('home', true),
                clientName: 'Ghost'
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

        it('ghost client is already present in database and title changes', function (done) {
            client = null;

            GhostPassport.init({
                authType: 'ghost',
                clientUri: 'http://my-blog.com',
                ghostAuthUrl: 'http://devauth.ghost.org',
                redirectUri: utils.url.urlFor('home', true),
                clientName: 'Ghost'
            }).then(function () {
                FakeGhostOAuth2Strategy.prototype.registerClient.called.should.eql(true);
                FakeGhostOAuth2Strategy.prototype.updateClient.called.should.eql(false);

                registeredEvents['settings.edited']({
                    attributes: {
                        key: 'title',
                        value: 'new-title'
                    },
                    _updatedAttributes: {
                        value: 'old-title'
                    }
                });

                (function retry() {
                    if (FakeGhostOAuth2Strategy.prototype.updateClient.called === true) {
                        return done();
                    }

                    setTimeout(retry, 100);
                })();
            }).catch(done);
        });

        it('ghost client does not exist', function () {
            client = null;

            return GhostPassport.init({
                authType: 'ghost',
                clientUri: 'http://my-blog.com',
                ghostAuthUrl: 'http://devauth.ghost.org',
                redirectUri: utils.url.urlFor('home', true),
                clientName: 'custom client name'
            }).then(function (response) {
                should.exist(response.passport);
                passport.use.callCount.should.eql(3);

                models.Client.findOne.called.should.eql(true);
                models.Client.add.called.should.eql(true);
                FakeGhostOAuth2Strategy.prototype.setClient.called.should.eql(true);
                FakeGhostOAuth2Strategy.prototype.registerClient.called.should.eql(true);
                FakeGhostOAuth2Strategy.prototype.registerClient.calledWith({
                    name: 'custom client name',
                    description: undefined
                }).should.eql(true);
            });
        });

        it('ghost client does not exist, ghost.org register client does not work', function () {
            client = null;

            FakeGhostOAuth2Strategy.prototype.registerClient.restore();
            FakeGhostOAuth2Strategy.prototype.registerClient = sandbox.stub();
            FakeGhostOAuth2Strategy.prototype.registerClient.returns(Promise.reject(new Error('cannot connect to ghost.org')));

            return GhostPassport.init({
                authType: 'ghost',
                clientUri: 'http://my-blog.com',
                ghostAuthUrl: 'http://devauth.ghost.org',
                redirectUri: utils.url.urlFor('home', true)
            }).catch(function (err) {
                (err instanceof errors.GhostError).should.eql(true);
                FakeGhostOAuth2Strategy.prototype.registerClient.callCount.should.eql(1);
            });
        });
    });
});
