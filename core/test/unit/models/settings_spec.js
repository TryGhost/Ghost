const should = require('should');
const sinon = require('sinon');
const mockDb = require('mock-knex');
const models = require('../../../server/models');
const {knex} = require('../../../server/data/db');
const common = require('../../../server/lib/common');

describe('Unit: models/settings', function () {
    before(function () {
        models.init();
    });

    describe('events', function () {
        let tracker;
        let eventSpy;

        beforeEach(function () {
            mockDb.mock(knex);
            tracker = mockDb.getTracker();
            tracker.install();
        });

        afterEach(function () {
            mockDb.unmock(knex);
        });

        beforeEach(function () {
            eventSpy = sinon.spy(common.events, 'emit');
        });

        afterEach(function () {
            sinon.restore();
        });

        it('emits add events', function () {
            tracker.on('query', (query, step) => {
                return [
                    function fetchAddQuery() {
                        query.response([{}]);
                    },
                    function addQuery() {
                        query.response([{
                            key: 'description',
                            value: 'added value'
                        }]);
                    }
                ][step - 1]();
            });

            return models.Settings.edit({
                key: 'description',
                value: 'added value'
            })
                .then(() => {
                    eventSpy.calledTwice.should.be.true();
                    eventSpy.firstCall.calledWith('settings.added').should.be.true();
                    eventSpy.secondCall.calledWith('settings.description.added').should.be.true();
                });
        });

        it('emits edit events', function () {
            tracker.on('query', (query, step) => {
                return [
                    function fetchEditQuery() {
                        query.response([{
                            id: 1, // NOTE: `id` imitates existing value for 'edit' event
                            key: 'description',
                            value: 'db value'
                        }]);
                    }
                ][step - 1]();
            });

            return models.Settings.edit({
                key: 'description',
                value: 'edited value'
            })
                .then(() => {
                    eventSpy.calledTwice.should.be.true();
                    eventSpy.firstCall.calledWith('settings.edited').should.be.true();
                    eventSpy.secondCall.calledWith('settings.description.edited').should.be.true();
                });
        });
    });

    describe('defaults', function () {
        let tracker;
        let eventSpy;

        beforeEach(function () {
            mockDb.mock(knex);
            tracker = mockDb.getTracker();
            tracker.install();
        });

        afterEach(function () {
            mockDb.unmock(knex);
            tracker.uninstall();
        });

        beforeEach(function () {
            eventSpy = sinon.spy(common.events, 'emit');
        });

        afterEach(function () {
            sinon.restore();
        });

        it('populates unset defaults', function () {
            tracker.on('query', (query) => {
                return query.response([{}]);
            });

            return models.Settings.populateDefaults()
                .then(() => {
                    eventSpy.callCount.should.equal(82);
                    const eventsEmitted = eventSpy.args.map(args => args[0]);
                    const checkEventEmitted = event => should.ok(eventsEmitted.includes(event), `${event} event should be emitted`);

                    checkEventEmitted('settings.db_hash.added');
                    checkEventEmitted('settings.description.added');

                    checkEventEmitted('settings.default_content_visibility.added');
                    checkEventEmitted('settings.members_subscription_settings.added');
                });
        });

        it('doesn\'t overwrite any existing settings', function () {
            tracker.on('query', (query) => {
                return query.response([{
                    key: 'description',
                    value: 'Adam\'s Blog'
                }]);
            });

            return models.Settings.populateDefaults()
                .then(() => {
                    eventSpy.callCount.should.equal(80);

                    eventSpy.args[13][0].should.equal('settings.logo.added');
                });
        });
    });

    describe('parse', function () {
        it('ensure correct parsing when fetching from db', function () {
            const setting = models.Settings.forge();

            let returns = setting.parse({key: 'is_private', value: 'false'});
            should.equal(returns.value, false);

            returns = setting.parse({key: 'is_private', value: false});
            should.equal(returns.value, false);

            returns = setting.parse({key: 'is_private', value: true});
            should.equal(returns.value, true);

            returns = setting.parse({key: 'is_private', value: 'true'});
            should.equal(returns.value, true);

            returns = setting.parse({key: 'is_private', value: '0'});
            should.equal(returns.value, false);

            returns = setting.parse({key: 'is_private', value: '1'});
            should.equal(returns.value, true);

            returns = setting.parse({key: 'something', value: 'null'});
            should.equal(returns.value, 'null');
        });
    });
});
