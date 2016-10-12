var passport = require('passport'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    rewire = require('rewire'),
    should = require('should'),
    sandbox = sinon.sandbox.create(),
    testUtils = require('../../utils'),
    GhostPassport = rewire('../../../server/auth/passport'),
    models = require('../../../server/models'),
    errors = require('../../../server/errors');

should.equal(true, true);

describe('Ghost Passport', function () {
    var client;

    function FakeGhostOAuth2Strategy() {
        this.name = 'FakeGhostOAuth2Strategy';
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
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('auth_type: password', function () {
        it('initialise passport with passport auth type', function () {
            return GhostPassport.init({
                type: 'passport'
            }).then(function (response) {
                should.exist(response.passport);
                passport.use.callCount.should.eql(2);

                models.Client.findOne.called.should.eql(false);
                models.Client.add.called.should.eql(false);
                FakeGhostOAuth2Strategy.prototype.setClient.called.should.eql(false);
                FakeGhostOAuth2Strategy.prototype.registerClient.called.should.eql(false);
            });
        });
    });

    describe('auth_type: ghost', function () {
        it('ghost client is already present in database', function () {
            client = new models.Client(testUtils.DataGenerator.forKnex.createClient());

            return GhostPassport.init({
                type: 'ghost'
            }).then(function (response) {
                should.exist(response.passport);
                passport.use.callCount.should.eql(3);

                models.Client.findOne.called.should.eql(true);
                models.Client.add.called.should.eql(false);
                FakeGhostOAuth2Strategy.prototype.setClient.called.should.eql(true);
                FakeGhostOAuth2Strategy.prototype.registerClient.called.should.eql(false);
            });
        });

        it('ghost client does not exist', function () {
            client = null;

            return GhostPassport.init({
                type: 'ghost'
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
                type: 'ghost'
            }).catch(function (err) {
                (err instanceof errors.IncorrectUsageError).should.eql(true);
                FakeGhostOAuth2Strategy.prototype.registerClient.callCount.should.eql(12);
            });
        });
    });
});
