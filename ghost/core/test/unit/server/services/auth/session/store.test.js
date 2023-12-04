const SessionStore = require('../../../../../../core/server/services/auth/session/SessionStore');
const models = require('../../../../../../core/server/models');
const EventEmitter = require('events');
const {Store} = require('express-session');
const sinon = require('sinon');
const should = require('should');

describe('Auth Service SessionStore', function () {
    before(function () {
        models.init();
    });
    afterEach(function () {
        sinon.restore();
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
        it('calls destroy on the model with the session_id `sid`', function (done) {
            const destroyStub = sinon.stub(models.Session, 'destroy')
                .resolves();

            const store = new SessionStore(models.Session);
            const sid = 1;
            store.destroy(sid, function () {
                const destroyStubCall = destroyStub.getCall(0);
                should.equal(destroyStubCall.args[0].session_id, sid);
                done();
            });
        });

        it('calls back with null if destroy resolve', function (done) {
            sinon.stub(models.Session, 'destroy')
                .resolves();

            const store = new SessionStore(models.Session);
            const sid = 1;
            store.destroy(sid, function (err) {
                should.equal(err, null);
                done();
            });
        });

        it('calls back with the error if destroy errors', function (done) {
            const error = new Error('beam me up scotty');
            sinon.stub(models.Session, 'destroy')
                .rejects(error);

            const store = new SessionStore(models.Session);
            const sid = 1;
            store.destroy(sid, function (err) {
                should.equal(err, error);
                done();
            });
        });
    });

    describe('SessionStore#get', function () {
        it('calls findOne on the model with the session_id `sid`', function (done) {
            const findOneStub = sinon.stub(models.Session, 'findOne')
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
            sinon.stub(models.Session, 'findOne')
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
            sinon.stub(models.Session, 'findOne')
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
            sinon.stub(models.Session, 'findOne')
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

        it('calls upsert on the model with the session_id and the session_data', function (done) {
            const upsertStub = sinon.stub(models.Session, 'upsert')
                .resolves();

            const store = new SessionStore(models.Session);
            const sid = 1;
            const session_data = {user_id: 100};
            store.set(sid, session_data, function () {
                const upsertStubCall = upsertStub.getCall(0);
                should.equal(upsertStubCall.args[0].session_data, session_data);
                should.equal(upsertStubCall.args[1].session_id, sid);
                done();
            });
        });

        it('calls back with an error if upsert errors', function (done) {
            const error = new Error('huuuuuurrr');
            sinon.stub(models.Session, 'upsert')
                .rejects(error);

            const store = new SessionStore(models.Session);
            const sid = 1;
            const session_data = {user_id: 100};
            store.set(sid, session_data, function (err) {
                should.equal(err, error);
                done();
            });
        });

        it('calls back with null, null if upsert succeed', function (done) {
            sinon.stub(models.Session, 'upsert')
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
