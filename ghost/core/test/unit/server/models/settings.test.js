const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const sinon = require('sinon');
const mockDb = require('mock-knex');
const models = require('../../../../core/server/models');
const config = require('../../../../core/shared/config');
const {knex} = require('../../../../core/server/data/db');
const events = require('../../../../core/server/lib/common/events');
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
                    assert.equal(eventSpy.calledTwice, true);
                    assert.equal(eventSpy.firstCall.calledWith('settings.added'), true);
                    assert.equal(eventSpy.secondCall.calledWith('settings.description.added'), true);
                });
        });

        it('emits edit events', function () {
            tracker.on('query', (query) => {
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
                    assert.equal(eventSpy.calledTwice, true);
                    assert.equal(eventSpy.firstCall.calledWith('settings.edited'), true);
                    assert.equal(eventSpy.secondCall.calledWith('settings.description.edited'), true);
                });
        });
    });

    describe('format', function () {
        it('transforms urls when persisting to db', function () {
            const setting = models.Settings.forge();
            const siteUrl = config.get('url');

            let returns = setting.formatOnWrite({key: 'cover_image', value: `${siteUrl}/cover_image.png`, type: 'string'});
            assert.equal(returns.value, '__GHOST_URL__/cover_image.png');

            returns = setting.formatOnWrite({key: 'logo', value: `${siteUrl}/logo.png`, type: 'string'});
            assert.equal(returns.value, '__GHOST_URL__/logo.png');

            returns = setting.formatOnWrite({key: 'icon', value: `${siteUrl}/icon.png`, type: 'string'});
            assert.equal(returns.value, '__GHOST_URL__/icon.png');

            returns = setting.formatOnWrite({key: 'portal_button_icon', value: `${siteUrl}/portal_button_icon.png`, type: 'string'});
            assert.equal(returns.value, '__GHOST_URL__/portal_button_icon.png');

            returns = setting.formatOnWrite({key: 'og_image', value: `${siteUrl}/og_image.png`, type: 'string'});
            assert.equal(returns.value, '__GHOST_URL__/og_image.png');

            returns = setting.formatOnWrite({key: 'twitter_image', value: `${siteUrl}/twitter_image.png`, type: 'string'});
            assert.equal(returns.value, '__GHOST_URL__/twitter_image.png');
        });
    });

    describe('parse', function () {
        it('ensure correct parsing when fetching from db', function () {
            const setting = models.Settings.forge();
            const siteUrl = config.get('url');

            let returns = setting.parse({key: 'is_private', value: 'false', type: 'boolean'});
            assert.equal(returns.value, false);

            returns = setting.parse({key: 'is_private', value: false, type: 'boolean'});
            assert.equal(returns.value, false);

            returns = setting.parse({key: 'is_private', value: true, type: 'boolean'});
            assert.equal(returns.value, true);

            returns = setting.parse({key: 'is_private', value: 'true', type: 'boolean'});
            assert.equal(returns.value, true);

            returns = setting.parse({key: 'is_private', value: '0', type: 'boolean'});
            assert.equal(returns.value, false);

            returns = setting.parse({key: 'is_private', value: '1', type: 'boolean'});
            assert.equal(returns.value, true);

            returns = setting.parse({key: 'something', value: 'null'});
            assert.equal(returns.value, 'null');

            returns = setting.parse({key: 'cover_image', value: '__GHOST_URL__/cover_image.png', type: 'string'});
            assert.equal(returns.value, `${siteUrl}/cover_image.png`);

            returns = setting.parse({key: 'logo', value: '__GHOST_URL__/logo.png', type: 'string'});
            assert.equal(returns.value, `${siteUrl}/logo.png`);

            returns = setting.parse({key: 'icon', value: '__GHOST_URL__/icon.png', type: 'string'});
            assert.equal(returns.value, `${siteUrl}/icon.png`);

            returns = setting.parse({key: 'portal_button_icon', value: '__GHOST_URL__/portal_button_icon.png', type: 'string'});
            assert.equal(returns.value, `${siteUrl}/portal_button_icon.png`);

            returns = setting.parse({key: 'og_image', value: '__GHOST_URL__/og_image.png', type: 'string'});
            assert.equal(returns.value, `${siteUrl}/og_image.png`);

            returns = setting.parse({key: 'twitter_image', value: '__GHOST_URL__/twitter_image.png', type: 'string'});
            assert.equal(returns.value, `${siteUrl}/twitter_image.png`);
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
                assertExists(error, `Setting Model should throw when saving invalid ${key}`);
                assert(error instanceof errors.ValidationError, 'Setting Model should throw ValidationError');
            }
        }

        async function testValidSetting({key, value, type, group}) {
            mockDb.mock(knex);
            const tracker = mockDb.getTracker();
            tracker.install();

            tracker.on('query', (query) => {
                query.response([{}]);
            });

            const setting = models.Settings.forge({key, value, type, group});

            // This should not reject.
            await setting.save();

            tracker.uninstall();
            mockDb.unmock(knex);
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
