const SessionStore = require('../../../../../server/services/auth/session/store');
const models = require('../../../../../server/models');
const EventEmitter = require('events');
const {Store} = require('express-session');
const sinon = require('sinon');
const should = require('should');

describe('Auth Service SessionStore', function () {
    let sandbox;
    before(function () {
        models.init();
        sandbox = sinon.sandbox.create();
    });
    afterEach(function () {
        sandbox.restore();
    });

    describe('inheritance', function () {
        it('Is an instance of EventEmitter', function () {
            const store = new SessionStore();
            should.equal(store instanceof EventEmitter, true);
        });

        it('Is an instance of Store', function () {
            const store = new SessionStore();
            should.equal(store instanceof Store, true);
        });
    });

    describe('SessionStore#destroy', function () {
        it('calls findOne on the model with the session_id `sid`', function (done) {
            const findOneStub = sandbox.stub(models.Session, 'findOne')
                .resolves();

            const store = new SessionStore(models.Session);
            const sid = 1;
            store.destroy(sid, function () {
                const findOneStubCall = findOneStub.getCall(0);
                should.equal(findOneStubCall.args[0].session_id, sid);
                done();
            });
        });

        it('calls back with null if findOne resolve without model', function (done) {
            sandbox.stub(models.Session, 'findOne')
                .resolves();

            const store = new SessionStore(models.Session);
            const sid = 1;
            store.destroy(sid, function (err) {
                should.equal(err, null);
                done();
            });
        });

        it('calls back with the error if findOne errors', function (done) {
            const error = new Error('beam me up scotty');
            sandbox.stub(models.Session, 'findOne')
                .rejects(error);

            const store = new SessionStore(models.Session);
            const sid = 1;
            store.destroy(sid, function (err) {
                should.equal(err, error);
                done();
            });
        });

        describe('when findOne resolves with a model', function () {
            it('calls destroy on the model with the session_id `sid` passing require: false', function (done) {
                const model = models.Session.forge();
                sandbox.stub(models.Session, 'findOne')
                    .resolves(model);

                const destroyStub = sandbox.stub(models.Session, 'destroy')
                    .resolves();

                const store = new SessionStore(models.Session);
                const sid = 1;
                store.destroy(sid, function () {
                    const destroyStubCall = destroyStub.getCall(0);
                    should.equal(destroyStubCall.args[0], model);
                    done();
                });
            });

            it('callsback with null or undefined if the destroy does not error', function (done) {
                const model = models.Session.forge();
                sandbox.stub(models.Session, 'findOne')
                    .resolves(model);

                sandbox.stub(models.Session, 'destroy')
                    .resolves();

                const store = new SessionStore(models.Session);
                const sid = 1;

                store.destroy(sid, function (err) {
                    should.equal(err, null);
                    done();
                });
            });

            it('callsback with an error if the destroy does error', function (done) {
                const model = models.Session.forge();
                sandbox.stub(models.Session, 'findOne')
                    .resolves(model);

                const error = new Error('hot damn');
                sandbox.stub(models.Session, 'destroy')
                    .rejects(error);

                const store = new SessionStore(models.Session);
                const sid = 1;
                store.destroy(sid, function (err) {
                    should.equal(err, error);
                    done();
                });
            });
        });
    });

    describe('SessionStore#get', function () {
        it('calls findOne on the model with the session_id `sid`', function (done) {
            const findOneStub = sandbox.stub(models.Session, 'findOne')
                .resolves();

            const store = new SessionStore(models.Session);
            const sid = 1;
            store.get(sid, function () {
                const findOneStubCall = findOneStub.getCall(0);
                should.equal(findOneStubCall.args[0].session_id, sid);
                done();
            });
        });

        it('callsback with null, null if findOne does not return a model', function (done) {
            sandbox.stub(models.Session, 'findOne')
                .resolves(null);

            const store = new SessionStore(models.Session);
            const sid = 1;
            store.get(sid, function (err, session) {
                should.equal(err, null);
                should.equal(session, null);
                done();
            });
        });

        it('callsback with null, model.session_data if findOne does return a model', function (done) {
            const model = models.Session.forge({
                session_data: {
                    ice: 'cube'
                }
            });
            sandbox.stub(models.Session, 'findOne')
                .resolves(model);

            const store = new SessionStore(models.Session);
            const sid = 1;
            store.get(sid, function (err, session) {
                should.equal(err, null);
                should.deepEqual(session, {
                    ice: 'cube'
                });
                done();
            });
        });

        it('callsback with an error if the findOne does error', function (done) {
            const error = new Error('hot damn');
            sandbox.stub(models.Session, 'findOne')
                .rejects(error);

            const store = new SessionStore(models.Session);
            const sid = 1;
            store.get(sid, function (err) {
                should.equal(err, error);
                done();
            });
        });
    });

    describe('SessionStore#set', function () {
        it('calls back with an error if there is no user_id on the session_data', function (done) {
            const store = new SessionStore(models.Session);
            const sid = 1;
            const session_data = {};
            store.set(sid, session_data, function (err) {
                should.exist(err);
                done();
            });
        });

        it('calls setSession on the model with the session_id and the session_data', function (done) {
            const setSessionStub = sandbox.stub(models.Session, 'setSession')
                .resolves();

            const store = new SessionStore(models.Session);
            const sid = 1;
            const session_data = {user_id: 100};
            store.set(sid, session_data, function () {
                const setSessionStubCall = setSessionStub.getCall(0);
                should.equal(setSessionStubCall.args[0], sid);
                should.equal(setSessionStubCall.args[1], session_data);
                done();
            });
        });

        it('calls back with an error if setSession errors', function (done) {
            const error = new Error('huuuuuurrr');
            sandbox.stub(models.Session, 'setSession')
                .rejects(error);

            const store = new SessionStore(models.Session);
            const sid = 1;
            const session_data = {user_id: 100};
            store.set(sid, session_data, function (err) {
                should.equal(err, error);
                done();
            });
        });

        it('calls back with null, null if setSession succeed', function (done) {
            sandbox.stub(models.Session, 'setSession')
                .resolves('success');

            const store = new SessionStore(models.Session);
            const sid = 1;
            const session_data = {user_id: 100};
            store.set(sid, session_data, function (err, data) {
                should.equal(err, null);
                should.equal(data, null);
                done();
            });
        });
    });
});
