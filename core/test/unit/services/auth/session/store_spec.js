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
        it('calls destroy on the model with the id `sid` passing require: false', function (done) {
            const destroyStub = sandbox.stub(models.Session.prototype, 'destroy')
                .resolves();

            const store = new SessionStore(models.Session);
            const sid = 1;
            store.destroy(sid, function () {
                const destroyStubCall = destroyStub.getCall(0);
                should.equal(destroyStubCall.args[0].require, false);
                should.equal(destroyStubCall.thisValue.id, sid);
                done();
            });
        });

        it('callsback with null or undefined if the destroy does not error', function (done) {
            const store = new SessionStore(models.Session);
            const sid = 1;
            store.destroy(sid, function (err) {
                should.equal(err, null);
                done();
            });
        });

        it('callsback with an error if the destroy does error', function (done) {
            const error = new Error('hot damn');
            const destroyStub = sandbox.stub(models.Session.prototype, 'destroy')
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
        it('calls fetch on the model with the id `sid`', function (done) {
            const fetchStub = sandbox.stub(models.Session.prototype, 'fetch')
                .resolves();

            const store = new SessionStore(models.Session);
            const sid = 1;
            store.get(sid, function () {
                const fetchStubCall = fetchStub.getCall(0);
                should.equal(fetchStubCall.thisValue.id, sid);
                done();
            });
        });

        it('callsback with null, null if fetch does not return a model', function (done) {
            const store = new SessionStore(models.Session);
            const sid = 1;
            store.get(sid, function (err, session) {
                should.equal(err, null);
                should.equal(session, null);
                done();
            });
        });

        it('callsback with null, model.session_data if fetch does return a model', function (done) {
            const model = models.Session.forge({
                session_data: {
                    ice: 'cube'
                }
            });
            const fetchStub = sandbox.stub(models.Session.prototype, 'fetch')
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

        it('callsback with an error if the fetch does error', function (done) {
            const error = new Error('hot damn');
            const fetchStub = sandbox.stub(models.Session.prototype, 'fetch')
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
        const getSavedAttributes = function getSavedAttributes(saveStubCall) {
            return Object.assign({}, saveStubCall.thisValue.attributes, saveStubCall.args[0]);
        };

        it('calls back with an error if there is no user_id on the session_data', function (done) {
            const store = new SessionStore(models.Session);
            const sid = 1;
            const session_data = {};
            store.set(sid, session_data, function (err) {
                should.exist(err);
                done();
            });
        });

        describe('new session', function () {
            it('sets the session_data and user_id property and saves the model forcing insert', function (done) {
                const saveStub = sandbox.stub(models.Session.prototype, 'save')
                    .resolves();

                const store = new SessionStore(models.Session);
                const sid = 1;
                const session_data = {
                    user_id: 100
                };
                store.set(sid, session_data, function () {
                    const saveStubCall = saveStub.getCall(0);
                    const savedAttributes = getSavedAttributes(saveStubCall);
                    should.deepEqual(savedAttributes, {
                        id: 1,
                        user_id: 100,
                        session_data
                    });
                    should.deepEqual(saveStubCall.args[1], {
                        method: 'insert'
                    });
                    done();
                });
            });
            it('calls back with null if the save succeeds', function (done) {
                const saveStub = sandbox.stub(models.Session.prototype, 'save')
                    .resolves();

                const store = new SessionStore(models.Session);
                const sid = 1;
                const session_data = {
                    user_id: 100
                };
                store.set(sid, session_data, function (err) {
                    should.equal(err, null);
                    done();
                });
            });
            it('calls back with error if the save errors', function (done) {
                const error = new Error('uh-uh');
                const saveStub = sandbox.stub(models.Session.prototype, 'save')
                    .rejects(error);

                const store = new SessionStore(models.Session);
                const sid = 1;
                const session_data = {
                    user_id: 100
                };
                store.set(sid, session_data, function (err) {
                    should.equal(err, error);
                    done();
                });
            });
        });
        describe('existing session', function () {
            const user_id = 100;
            beforeEach(function () {
                sandbox.stub(models.Session.prototype, 'fetch').callsFake(function () {
                    this.set('user_id', user_id);
                    return Promise.resolve(this);
                });
            });

            it('sets the session_data and user_id property and saves the model', function (done) {
                const saveStub = sandbox.stub(models.Session.prototype, 'save')
                    .resolves();

                const store = new SessionStore(models.Session);
                const sid = 1;
                const session_data = {
                    user_id
                };
                store.set(sid, session_data, function () {
                    const saveStubCall = saveStub.getCall(0);
                    const savedAttributes = getSavedAttributes(saveStubCall);
                    should.deepEqual(savedAttributes, {
                        id: 1,
                        user_id,
                        session_data
                    });
                    done();
                });
            });
            it('calls back with null if the save succeeds', function (done) {
                const saveStub = sandbox.stub(models.Session.prototype, 'save')
                    .resolves();

                const store = new SessionStore(models.Session);
                const sid = 1;
                const session_data = {
                    user_id
                };
                store.set(sid, session_data, function (err) {
                    should.equal(err, null);
                    done();
                });
            });
            it('calls back with error if the save errors', function (done) {
                const error = new Error('i did not leave the south side for this');
                const saveStub = sandbox.stub(models.Session.prototype, 'save')
                    .rejects(error);

                const store = new SessionStore(models.Session);
                const sid = 1;
                const session_data = {
                    user_id
                };
                store.set(sid, session_data, function (err) {
                    should.equal(err, error);
                    done();
                });
            });
        });
    });
});
