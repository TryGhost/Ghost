const assert = require('node:assert/strict');
const {deferred} = require('../../../../../utils/deferred')
const SessionStore = require('../../../../../../core/server/services/auth/session/session-store');
const {Session} = require('../../../../../../core/server/models/session');
const EventEmitter = require('events');
const {Store} = require('express-session');
const sinon = require('sinon');

describe('Auth Service SessionStore', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('inheritance', function () {
        it('Is an instance of EventEmitter', function () {
            const store = new SessionStore();
            assert.equal(store instanceof EventEmitter, true);
        });

        it('Is an instance of Store', function () {
            const store = new SessionStore();
            assert.equal(store instanceof Store, true);
        });
    });

    describe('SessionStore#destroy', function () {
        it('calls destroy on the model with the session_id `sid`', function () {
            const {promise, done} = deferred();
            const destroyStub = sinon.stub(Session, 'destroy')
                .resolves();

            const store = new SessionStore(Session);
            const sid = 1;
            store.destroy(sid, function () {
                const destroyStubCall = destroyStub.getCall(0);
                assert.equal(destroyStubCall.args[0].session_id, sid);
                done();
            });
            return promise;
        });

        it('calls back with null if destroy resolve', function () {
            const {promise, done} = deferred();
            sinon.stub(Session, 'destroy')
                .resolves();

            const store = new SessionStore(Session);
            const sid = 1;
            store.destroy(sid, function (err) {
                assert.equal(err, null);
                done();
            });
            return promise;
        });

        it('calls back with the error if destroy errors', function () {
            const {promise, done} = deferred();
            const error = new Error('beam me up scotty');
            sinon.stub(Session, 'destroy')
                .rejects(error);

            const store = new SessionStore(Session);
            const sid = 1;
            store.destroy(sid, function (err) {
                assert.equal(err, error);
                done();
            });
            return promise;
        });
    });

    describe('SessionStore#get', function () {
        it('calls findOne on the model with the session_id `sid`', function () {
            const {promise, done} = deferred();
            const findOneStub = sinon.stub(Session, 'findOne')
                .resolves();

            const store = new SessionStore(Session);
            const sid = 1;
            store.get(sid, function () {
                const findOneStubCall = findOneStub.getCall(0);
                assert.equal(findOneStubCall.args[0].session_id, sid);
                done();
            });
            return promise;
        });

        it('callsback with null, null if findOne does not return a model', function () {
            const {promise, done} = deferred();
            sinon.stub(Session, 'findOne')
                .resolves(null);

            const store = new SessionStore(Session);
            const sid = 1;
            store.get(sid, function (err, session) {
                assert.equal(err, null);
                assert.equal(session, null);
                done();
            });
            return promise;
        });

        it('callsback with null, model.session_data if findOne does return a model', function () {
            const {promise, done} = deferred();
            const model = Session.forge({
                session_data: {
                    ice: 'cube'
                }
            });
            sinon.stub(Session, 'findOne')
                .resolves(model);

            const store = new SessionStore(Session);
            const sid = 1;
            store.get(sid, function (err, session) {
                assert.equal(err, null);
                assert.deepEqual(session, {
                    ice: 'cube'
                });
                done();
            });
            return promise;
        });

        it('callsback with an error if the findOne does error', function () {
            const {promise, done} = deferred();
            const error = new Error('hot damn');
            sinon.stub(Session, 'findOne')
                .rejects(error);

            const store = new SessionStore(Session);
            const sid = 1;
            store.get(sid, function (err) {
                assert.equal(err, error);
                done();
            });
            return promise;
        });
    });

    describe('SessionStore#set', function () {
        it('calls upsert on the model with the session_id and the session_data', function () {
            const {promise, done} = deferred();
            const upsertStub = sinon.stub(Session, 'upsert')
                .resolves();

            const store = new SessionStore(Session);
            const sid = 1;
            const session_data = {user_id: 100};
            store.set(sid, session_data, function () {
                const upsertStubCall = upsertStub.getCall(0);
                assert.equal(upsertStubCall.args[0].session_data, session_data);
                assert.equal(upsertStubCall.args[1].session_id, sid);
                done();
            });
            return promise;
        });

        it('calls back with an error if upsert errors', function () {
            const {promise, done} = deferred();
            const error = new Error('huuuuuurrr');
            sinon.stub(Session, 'upsert')
                .rejects(error);

            const store = new SessionStore(Session);
            const sid = 1;
            const session_data = {user_id: 100};
            store.set(sid, session_data, function (err) {
                assert.equal(err, error);
                done();
            });
            return promise;
        });

        it('calls back with null, null if upsert succeed', function () {
            const {promise, done} = deferred();
            sinon.stub(Session, 'upsert')
                .resolves('success');

            const store = new SessionStore(Session);
            const sid = 1;
            const session_data = {user_id: 100};
            store.set(sid, session_data, function (err, data) {
                assert.equal(err, null);
                assert.equal(data, undefined);
                done();
            });
            return promise;
        });
    });
});
