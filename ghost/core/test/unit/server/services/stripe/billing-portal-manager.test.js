const assert = require('node:assert/strict');
const sinon = require('sinon');
const {BillingPortalManager} = require('../../../../../core/server/services/stripe/billing-portal-manager');

describe('BillingPortalManager', function () {
    let mockApi;
    let mockSettingsModel;
    let mockSettingsCache;

    beforeEach(function () {
        mockApi = {
            createBillingPortalConfiguration: sinon.stub(),
            updateBillingPortalConfiguration: sinon.stub()
        };
        mockSettingsModel = {
            edit: sinon.stub().resolves()
        };
        mockSettingsCache = {
            get: sinon.stub()
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('configure', function () {
        it('sets siteUrl and marks as configured', function () {
            const manager = new BillingPortalManager({
                api: mockApi,
                models: {Settings: mockSettingsModel},
                settingsCache: mockSettingsCache
            });

            manager.configure({siteUrl: 'https://example.com'});

            const options = manager.getConfigurationOptions();
            assert.equal(options.default_return_url, 'https://example.com');
        });
    });

    describe('start', function () {
        it('does nothing if not configured', async function () {
            const manager = new BillingPortalManager({
                api: mockApi,
                models: {Settings: mockSettingsModel},
                settingsCache: mockSettingsCache
            });

            await manager.start();

            assert.equal(mockApi.createBillingPortalConfiguration.called, false);
            assert.equal(mockApi.updateBillingPortalConfiguration.called, false);
        });

        it('creates new configuration if none exists', async function () {
            mockSettingsCache.get.withArgs('stripe_billing_portal_configuration_id').returns(null);
            mockSettingsCache.get.withArgs('title').returns('Test Site');
            mockApi.createBillingPortalConfiguration.resolves({id: 'bpc_new123'});

            const manager = new BillingPortalManager({
                api: mockApi,
                models: {Settings: mockSettingsModel},
                settingsCache: mockSettingsCache
            });
            manager.configure({siteUrl: 'https://example.com'});

            await manager.start();

            assert.equal(mockApi.createBillingPortalConfiguration.calledOnce, true);
            assert.equal(mockSettingsModel.edit.calledOnce, true);
            assert.deepEqual(mockSettingsModel.edit.firstCall.args[0], [{
                key: 'stripe_billing_portal_configuration_id',
                value: 'bpc_new123'
            }]);
        });

        it('updates existing configuration', async function () {
            mockSettingsCache.get.withArgs('stripe_billing_portal_configuration_id').returns('bpc_existing123');
            mockSettingsCache.get.withArgs('title').returns('Test Site');
            mockApi.updateBillingPortalConfiguration.resolves({id: 'bpc_existing123'});

            const manager = new BillingPortalManager({
                api: mockApi,
                models: {Settings: mockSettingsModel},
                settingsCache: mockSettingsCache
            });
            manager.configure({siteUrl: 'https://example.com'});

            await manager.start();

            assert.equal(mockApi.updateBillingPortalConfiguration.calledOnce, true);
            assert.equal(mockApi.createBillingPortalConfiguration.called, false);
            assert.equal(mockSettingsModel.edit.called, false);
        });

        it('saves new configuration ID when it changes after update', async function () {
            mockSettingsCache.get.withArgs('stripe_billing_portal_configuration_id').returns('bpc_old');
            mockSettingsCache.get.withArgs('title').returns('Test Site');
            mockApi.updateBillingPortalConfiguration.resolves({id: 'bpc_new'});

            const manager = new BillingPortalManager({
                api: mockApi,
                models: {Settings: mockSettingsModel},
                settingsCache: mockSettingsCache
            });
            manager.configure({siteUrl: 'https://example.com'});

            await manager.start();

            assert.equal(mockSettingsModel.edit.calledOnce, true);
            assert.deepEqual(mockSettingsModel.edit.firstCall.args[0], [{
                key: 'stripe_billing_portal_configuration_id',
                value: 'bpc_new'
            }]);
        });
    });

    describe('createOrUpdateConfiguration', function () {
        it('creates new configuration when id is null', async function () {
            mockSettingsCache.get.withArgs('title').returns('Test Site');
            mockApi.createBillingPortalConfiguration.resolves({id: 'bpc_new123'});

            const manager = new BillingPortalManager({
                api: mockApi,
                models: {Settings: mockSettingsModel},
                settingsCache: mockSettingsCache
            });
            manager.configure({siteUrl: 'https://example.com'});

            const result = await manager.createOrUpdateConfiguration(null);

            assert.equal(result, 'bpc_new123');
            assert.equal(mockApi.createBillingPortalConfiguration.calledOnce, true);
        });

        it('updates existing configuration when id is provided', async function () {
            mockSettingsCache.get.withArgs('title').returns('Test Site');
            mockApi.updateBillingPortalConfiguration.resolves({id: 'bpc_existing123'});

            const manager = new BillingPortalManager({
                api: mockApi,
                models: {Settings: mockSettingsModel},
                settingsCache: mockSettingsCache
            });
            manager.configure({siteUrl: 'https://example.com'});

            const result = await manager.createOrUpdateConfiguration('bpc_existing123');

            assert.equal(result, 'bpc_existing123');
            assert.equal(mockApi.updateBillingPortalConfiguration.calledOnce, true);
            assert.equal(mockApi.updateBillingPortalConfiguration.firstCall.args[0], 'bpc_existing123');
        });

        it('creates new configuration when update fails with resource_missing', async function () {
            mockSettingsCache.get.withArgs('title').returns('Test Site');
            const resourceMissingError = new Error('Configuration not found');
            resourceMissingError.code = 'resource_missing';
            mockApi.updateBillingPortalConfiguration.rejects(resourceMissingError);
            mockApi.createBillingPortalConfiguration.resolves({id: 'bpc_new456'});

            const manager = new BillingPortalManager({
                api: mockApi,
                models: {Settings: mockSettingsModel},
                settingsCache: mockSettingsCache
            });
            manager.configure({siteUrl: 'https://example.com'});

            const result = await manager.createOrUpdateConfiguration('bpc_deleted');

            assert.equal(result, 'bpc_new456');
            assert.equal(mockApi.updateBillingPortalConfiguration.calledOnce, true);
            assert.equal(mockApi.createBillingPortalConfiguration.calledOnce, true);
        });

        it('throws error when update fails with non-resource_missing error', async function () {
            mockSettingsCache.get.withArgs('title').returns('Test Site');
            const genericError = new Error('Stripe API error');
            mockApi.updateBillingPortalConfiguration.rejects(genericError);

            const manager = new BillingPortalManager({
                api: mockApi,
                models: {Settings: mockSettingsModel},
                settingsCache: mockSettingsCache
            });
            manager.configure({siteUrl: 'https://example.com'});

            await assert.rejects(
                () => manager.createOrUpdateConfiguration('bpc_existing'),
                {message: 'Stripe API error'}
            );
        });
    });

    describe('getConfigurationOptions', function () {
        it('returns full configuration options by default', function () {
            mockSettingsCache.get.withArgs('title').returns('My Ghost Site');

            const manager = new BillingPortalManager({
                api: mockApi,
                models: {Settings: mockSettingsModel},
                settingsCache: mockSettingsCache
            });
            manager.configure({siteUrl: 'https://example.com'});

            const options = manager.getConfigurationOptions();

            assert.deepEqual(options, {
                business_profile: {
                    headline: 'Subscription & payment details'
                },
                features: {
                    invoice_history: {enabled: true},
                    payment_method_update: {enabled: true},
                    subscription_cancel: {enabled: false}
                },
                default_return_url: 'https://example.com'
            });
        });

        it('returns everything except the profile when updateOnly is true', function () {
            mockSettingsCache.get.withArgs('title').returns('My Ghost Site');

            const manager = new BillingPortalManager({
                api: mockApi,
                models: {Settings: mockSettingsModel},
                settingsCache: mockSettingsCache
            });
            manager.configure({siteUrl: 'https://example.com'});

            const options = manager.getConfigurationOptions(true);

            assert.deepEqual(options, {
                default_return_url: 'https://example.com',
                features: {
                    invoice_history: {
                        enabled: true
                    },
                    payment_method_update: {
                        enabled: true
                    },
                    subscription_cancel: {
                        enabled: false
                    }
                }
            });
        });

        it('uses site title from settings cache in headline', function () {
            mockSettingsCache.get.withArgs('title').returns('Awesome Blog');

            const manager = new BillingPortalManager({
                api: mockApi,
                models: {Settings: mockSettingsModel},
                settingsCache: mockSettingsCache
            });
            manager.configure({siteUrl: 'https://example.com'});

            const options = manager.getConfigurationOptions();

            assert.equal(options.business_profile.headline, 'Subscription & payment details');
        });
    });
});
