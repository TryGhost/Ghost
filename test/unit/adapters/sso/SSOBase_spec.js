const should = require('should');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

describe('SSO: base adapter', function () {
    let expressStub;
    let get;
    let authSpy;
    let modelsSpy;
    let Adapter;
    const scope = {adapter: null};

    beforeEach(function () {
        get = sinon.spy();
        expressStub = () => ({
            get,
            enable: () => {}
        });

        modelsSpy = {
            User: {findOne: sinon.stub()}
        };
        authSpy = {
            session: {createSession: sinon.stub().resolves()}
        };

        Adapter = proxyquire('../../../../core/server/adapters/sso/SSOBase', {
            '../../../shared/express': expressStub,
            '../../models': modelsSpy,
            '../../services/auth': authSpy
        });
        Adapter.prototype.setupSSOApp = sinon.stub();
        Adapter.prototype.getProviders = sinon.stub().returns([]);
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should define providers endpoint', function () {
        const adapter = new Adapter();

        adapter.getSSOApp();

        get.calledWith('/providers/').should.be.true();

        adapter.getProviders().should.eql([]);
    });

    it('should check if user exists and is active', function (done) {
        const adapter = new Adapter();
        const profile = {
            emails: ['email1@example.com', 'email2@example.com']
        };
        const fakeUser = {
            id: 123
        };

        modelsSpy.User.findOne = sinon.stub()
            .onCall(0).resolves(null)
            .onCall(1).resolves(fakeUser);

        adapter.verifyUser(null, null, profile, function next(err, user) {
            user.should.eql(fakeUser);
            done();
        });
    });

    it('should fail when profile has no emails', function (done) {
        const adapter = new Adapter();
        const profile = {};

        adapter.verifyUser(null, null, profile, function next(err, user) {
            user.should.be.false();
            done();
        });
    });

    it('should fail when email not found', function (done) {
        const adapter = new Adapter();
        const profile = {
            emails: ['email1@example.com']
        };

        adapter.verifyUser(null, null, profile, function next(err, user) {
            user.should.be.false();
            done();
        });
    });

    it('should create session and redirect to admin', function (done) {
        const adapter = new Adapter();
        const fakeReq = {};
        const fakeRes = {redirect: (url) => {
            try {
                url.should.eql('/ghost/');
                done();
            } catch (err) {
                done(err);
            }
        }};
        authSpy.session.createSession = sinon.stub().resolves();

        adapter.createSession(fakeReq, fakeRes);
    });
});
