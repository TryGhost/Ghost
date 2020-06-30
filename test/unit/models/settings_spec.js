const should = require('should');
const sinon = require('sinon');
const mockDb = require('mock-knex');
const models = require('../../../core/server/models');
const {knex} = require('../../../core/server/data/db');
const {events} = require('../../../core/server/lib/common');
const defaultSettings = require('../../../core/server/data/schema/default-settings');

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
            eventSpy = sinon.spy(events, 'emit');
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

            return models.Settings.add({
                key: 'description',
                value: 'added value',
                type: 'string'
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
            eventSpy = sinon.spy(events, 'emit');
        });

        afterEach(function () {
            sinon.restore();
        });

        it('populates unset defaults', function () {
            let insertQueries = [];

            tracker.on('query', (query) => {
                // skip group and flags columns so we can test the insertion column skip
                if (query.method === 'columnInfo') {
                    return query.response([
                        {name: 'id', type: 'varchar'},
                        // {name: 'group', type: 'varchar'},
                        {name: 'key', type: 'varchar'},
                        {name: 'value', type: 'varchar'},
                        {name: 'type', type: 'varchar'},
                        // {name: 'flags', type: 'varchar'},
                        {name: 'created_at', type: 'datetime'},
                        {name: 'created_by', type: 'varchar'},
                        {name: 'updated_at', type: 'varchar'},
                        {name: 'updated_by', type: 'datetime'}
                    ]);
                }

                if (query.method === 'insert') {
                    insertQueries.push(query);
                }

                return query.response([{}]);
            });

            return models.Settings.populateDefaults()
                .then(() => {
                    const numberOfSettings = Object.keys(defaultSettings).reduce((settings, settingGroup) => {
                        return settings.concat(Object.keys(defaultSettings[settingGroup]));
                    }, []).length;

                    insertQueries.length.should.equal(numberOfSettings);

                    // non-existent columns should not be populated
                    insertQueries[0].sql.should.not.match(/group/);
                    insertQueries[0].sql.should.not.match(/flags/);

                    // no events are emitted because we're not using the model layer
                    eventSpy.callCount.should.equal(0);
                });
        });

        it('doesn\'t overwrite any existing settings', function () {
            let insertQueries = [];

            tracker.on('query', (query) => {
                if (query.method === 'columnInfo') {
                    return query.response([
                        {name: 'id', type: 'varchar'},
                        {name: 'key', type: 'varchar'},
                        {name: 'value', type: 'varchar'}
                    ]);
                }

                if (query.method === 'insert') {
                    insertQueries.push(query);
                }

                return query.response([{
                    key: 'description',
                    value: 'Adam\'s Blog'
                }]);
            });

            return models.Settings.populateDefaults()
                .then(() => {
                    const numberOfSettings = Object.keys(defaultSettings).reduce((settings, settingGroup) => {
                        return settings.concat(Object.keys(defaultSettings[settingGroup]));
                    }, []).length;

                    insertQueries.length.should.equal(numberOfSettings - 1);
                });
        });
    });

    describe('parse', function () {
        it('ensure correct parsing when fetching from db', function () {
            const setting = models.Settings.forge();

            let returns = setting.parse({key: 'is_private', value: 'false', type: 'boolean'});
            should.equal(returns.value, false);

            returns = setting.parse({key: 'is_private', value: false, type: 'boolean'});
            should.equal(returns.value, false);

            returns = setting.parse({key: 'is_private', value: true, type: 'boolean'});
            should.equal(returns.value, true);

            returns = setting.parse({key: 'is_private', value: 'true', type: 'boolean'});
            should.equal(returns.value, true);

            returns = setting.parse({key: 'is_private', value: '0', type: 'boolean'});
            should.equal(returns.value, false);

            returns = setting.parse({key: 'is_private', value: '1', type: 'boolean'});
            should.equal(returns.value, true);

            returns = setting.parse({key: 'something', value: 'null'});
            should.equal(returns.value, 'null');
        });
    });
});
