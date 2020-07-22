const should = require('should');
const sinon = require('sinon');
const mockDb = require('mock-knex');
const models = require('../../../core/server/models');
const {knex} = require('../../../core/server/data/db');
const {events} = require('../../../core/server/lib/common');
const defaultSettings = require('../../../core/server/data/schema/default-settings');
const errors = require('@tryghost/errors');

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
            eventSpy = sinon.spy(events, 'emit');
        });

        afterEach(function () {
            tracker.uninstall();
            mockDb.unmock(knex);
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
                if (query.method === 'select') {
                    return query.response([{
                        id: 1, // NOTE: `id` imitates existing value for 'edit' event
                        key: 'description',
                        value: 'db value'
                    }]);
                }

                return query.response([{}]);
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

    describe('validation', function () {
        async function testInvalidSetting({key, value, type, group}) {
            const setting = models.Settings.forge({key, value, type, group});

            let error;
            try {
                await setting.save();
                error = null;
            } catch (err) {
                error = err;
            } finally {
                should.exist(error, `Setting Model should throw when saving invalid ${key}`);
                should.ok(error instanceof errors.ValidationError, 'Setting Model should throw ValidationError');
            }
        }

        async function testValidSetting({key, value, type, group}) {
            mockDb.mock(knex);
            const tracker = mockDb.getTracker();
            tracker.install();

            tracker.on('query', (query) => {
                query.response();
            });

            const setting = models.Settings.forge({key, value, type, group});

            let error;
            try {
                await setting.save();
                error = null;
            } catch (err) {
                error = err;
            } finally {
                tracker.uninstall();
                mockDb.unmock(knex);
                should.not.exist(error, `Setting Model should not throw when saving valid ${key}`);
            }
        }

        it('throws when stripe_secret_key is invalid', async function () {
            await testInvalidSetting({
                key: 'stripe_secret_key',
                value: 'INVALID STRIPE SECRET KEY',
                type: 'string',
                group: 'members'
            });
        });

        it('throws when stripe_publishable_key is invalid', async function () {
            await testInvalidSetting({
                key: 'stripe_publishable_key',
                value: 'INVALID STRIPE PUBLISHABLE KEY',
                type: 'string',
                group: 'members'
            });
        });

        it('does not throw when stripe_secret_key is valid', async function () {
            await testValidSetting({
                key: 'stripe_secret_key',
                value: 'rk_live_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                type: 'string',
                group: 'members'
            });
            await testValidSetting({
                key: 'stripe_secret_key',
                value: 'sk_live_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                type: 'string',
                group: 'members'
            });
        });

        it('does not throw when stripe_publishable_key is valid', async function () {
            await testValidSetting({
                key: 'stripe_publishable_key',
                value: 'pk_live_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                type: 'string',
                group: 'members'
            });
        });

        it('throws when stripe_connect_secret_key is invalid', async function () {
            await testInvalidSetting({
                key: 'stripe_connect_secret_key',
                value: 'INVALID STRIPE CONNECT SECRET KEY',
                type: 'string',
                group: 'members'
            });
        });

        it('throws when stripe_connect_publishable_key is invalid', async function () {
            await testInvalidSetting({
                key: 'stripe_connect_publishable_key',
                value: 'INVALID STRIPE CONNECT PUBLISHABLE KEY',
                type: 'string',
                group: 'members'
            });
        });

        it('does not throw when stripe_connect_secret_key is valid', async function () {
            await testValidSetting({
                key: 'stripe_connect_secret_key',
                value: 'sk_live_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                type: 'string',
                group: 'members'
            });
        });

        it('does not throw when stripe_connect_publishable_key is valid', async function () {
            await testValidSetting({
                key: 'stripe_connect_publishable_key',
                value: 'pk_live_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                type: 'string',
                group: 'members'
            });
        });

        it('throws when stripe_plans has invalid name', async function () {
            await testInvalidSetting({
                key: 'stripe_plans',
                value: JSON.stringify([{
                    name: null,
                    amount: 500,
                    interval: 'month',
                    currency: 'usd'
                }]),
                type: 'string',
                group: 'members'
            });
        });

        it('throws when stripe_plans has invalid amount', async function () {
            await testInvalidSetting({
                key: 'stripe_plans',
                value: JSON.stringify([{
                    name: 'Monthly',
                    amount: 0,
                    interval: 'month',
                    currency: 'usd'
                }]),
                type: 'string',
                group: 'members'
            });
        });

        it('throws when stripe_plans has invalid interval', async function () {
            await testInvalidSetting({
                key: 'stripe_plans',
                value: JSON.stringify([{
                    name: 'Monthly',
                    amount: 500,
                    interval: 'monthly', // should be 'month'
                    currency: 'usd'
                }]),
                type: 'string',
                group: 'members'
            });
        });

        it('throws when stripe_plans has invalid currency', async function () {
            await testInvalidSetting({
                key: 'stripe_plans',
                value: JSON.stringify([{
                    name: 'Monthly',
                    amount: 500,
                    interval: 'month',
                    currency: null
                }]),
                type: 'string',
                group: 'members'
            });
        });

        it('does not throw when stripe_plans is valid', async function () {
            await testValidSetting({
                key: 'stripe_plans',
                value: JSON.stringify([{
                    name: 'Monthly',
                    amount: 500,
                    interval: 'month',
                    currency: 'usd'
                }]),
                type: 'string',
                group: 'members'
            });
        });
    });
});
