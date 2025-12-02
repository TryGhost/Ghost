const assert = require('assert/strict');
const sinon = require('sinon');

describe('ActivityPubServiceWrapper', function () {
    let ActivityPubServiceWrapper;
    let mockSettingsCache;
    let mockEvents;
    let mockLogging;
    let mockActivityPubService;
    let eventHandlers;

    beforeEach(function () {
        // Reset module cache to get fresh instance
        delete require.cache[require.resolve('../../../../../core/server/services/activitypub/ActivityPubServiceWrapper')];

        // Setup mocks
        eventHandlers = {};

        mockSettingsCache = {
            get: sinon.stub()
        };

        mockEvents = {
            on: sinon.stub().callsFake((event, handler) => {
                eventHandlers[event] = handler;
            })
        };

        mockLogging = {
            error: sinon.stub(),
            info: sinon.stub()
        };

        mockActivityPubService = {
            enable: sinon.stub().resolves(),
            disable: sinon.stub().resolves(),
            initialiseWebhooks: sinon.stub().resolves(),
            removeWebhooks: sinon.stub().resolves()
        };

        const mockIdentityTokenServiceWrapper = {
            instance: {}
        };

        require.cache[require.resolve('../../../../../core/shared/settings-cache')] = {
            exports: mockSettingsCache
        };
        require.cache[require.resolve('../../../../../core/server/lib/common/events')] = {
            exports: mockEvents
        };
        require.cache[require.resolve('@tryghost/logging')] = {
            exports: mockLogging
        };
        require.cache[require.resolve('../../../../../core/server/services/identity-tokens')] = {
            exports: mockIdentityTokenServiceWrapper
        };
        require.cache[require.resolve('../../../../../core/server/data/db')] = {
            exports: {knex: {}}
        };
        require.cache[require.resolve('../../../../../core/shared/url-utils')] = {
            exports: {getSiteUrl: () => 'https://example.com'}
        };
        require.cache[require.resolve('../../../../../core/server/services/activitypub/ActivityPubService')] = {
            exports: {
                ActivityPubService: function () {
                    return mockActivityPubService;
                }
            }
        };

        // Load the module
        ActivityPubServiceWrapper = require('../../../../../core/server/services/activitypub/ActivityPubServiceWrapper');
    });

    afterEach(function () {
        sinon.restore();

        // Clean up module cache
        delete require.cache[require.resolve('../../../../../core/server/services/activitypub/ActivityPubServiceWrapper')];
        delete require.cache[require.resolve('../../../../../core/shared/settings-cache')];
        delete require.cache[require.resolve('../../../../../core/server/lib/common/events')];
        delete require.cache[require.resolve('@tryghost/logging')];
        delete require.cache[require.resolve('../../../../../core/server/services/identity-tokens')];
        delete require.cache[require.resolve('../../../../../core/server/data/db')];
        delete require.cache[require.resolve('../../../../../core/shared/url-utils')];
        delete require.cache[require.resolve('../../../../../core/server/services/activitypub/ActivityPubService')];

        // Reset static properties
        if (ActivityPubServiceWrapper) {
            ActivityPubServiceWrapper.instance = undefined;
            ActivityPubServiceWrapper.initialised = false;
        }
    });

    describe('Event registration', function () {
        it('registers listener for settings.is_private.edited event', async function () {
            mockSettingsCache.get.withArgs('social_web_enabled').returns(false);
            mockSettingsCache.get.withArgs('is_private').returns(false);

            await ActivityPubServiceWrapper.init();

            assert.ok(eventHandlers['settings.is_private.edited'], 'is_private.edited handler should be registered');
            assert.ok(eventHandlers['settings.social_web.edited'], 'social_web.edited handler should be registered');
            assert.ok(eventHandlers['settings.labs.edited'], 'labs.edited handler should be registered');
        });
    });

    describe('Boot scenarios', function () {
        it('creates webhooks when social_web=true and is_private=false', async function () {
            mockSettingsCache.get.withArgs('social_web_enabled').returns(true);
            mockSettingsCache.get.withArgs('is_private').returns(false);

            await ActivityPubServiceWrapper.init();

            assert.ok(mockActivityPubService.enable.calledOnce, 'enable() should be called');
            assert.ok(ActivityPubServiceWrapper.initialised, 'initialised should be true');
        });

        it('does not create webhooks when social_web=true and is_private=true', async function () {
            mockSettingsCache.get.withArgs('social_web_enabled').returns(true);
            mockSettingsCache.get.withArgs('is_private').returns(true);

            await ActivityPubServiceWrapper.init();

            assert.ok(mockActivityPubService.enable.notCalled, 'enable() should not be called');
            assert.ok(ActivityPubServiceWrapper.initialised, 'initialised should still be true');
        });

        it('does nothing when social_web=false', async function () {
            mockSettingsCache.get.withArgs('social_web_enabled').returns(false);
            mockSettingsCache.get.withArgs('is_private').returns(false);

            await ActivityPubServiceWrapper.init();

            assert.ok(mockActivityPubService.enable.notCalled, 'enable() should not be called');
            assert.ok(mockActivityPubService.disable.notCalled, 'disable() should not be called');
            assert.ok(!ActivityPubServiceWrapper.initialised, 'initialised should be false');
        });
    });

    describe('Runtime transitions - is_private changes', function () {
        it('removes webhooks when is_private becomes true (social_web enabled)', async function () {
            mockSettingsCache.get.withArgs('social_web_enabled').returns(true);
            mockSettingsCache.get.withArgs('is_private').returns(false);

            await ActivityPubServiceWrapper.init();

            // Reset call counts
            mockActivityPubService.enable.resetHistory();
            mockActivityPubService.removeWebhooks.resetHistory();
            mockActivityPubService.disable.resetHistory();

            // Simulate is_private enabled
            mockSettingsCache.get.withArgs('is_private').returns(true);
            await eventHandlers['settings.is_private.edited']();

            assert.ok(mockActivityPubService.removeWebhooks.calledOnce, 'removeWebhooks() should be called');
            assert.ok(mockActivityPubService.disable.notCalled, 'disable() should NOT be called');
        });

        it('creates webhooks when is_private becomes false (social_web enabled)', async function () {
            mockSettingsCache.get.withArgs('social_web_enabled').returns(true);
            mockSettingsCache.get.withArgs('is_private').returns(true);

            await ActivityPubServiceWrapper.init();

            // Reset call counts
            mockActivityPubService.initialiseWebhooks.resetHistory();

            // Simulate is_private disabled
            mockSettingsCache.get.withArgs('is_private').returns(false);
            await eventHandlers['settings.is_private.edited']();

            assert.ok(mockActivityPubService.initialiseWebhooks.calledOnce, 'initialiseWebhooks() should be called');
        });

        it('does nothing when is_private changes but social_web is disabled', async function () {
            mockSettingsCache.get.withArgs('social_web_enabled').returns(false);
            mockSettingsCache.get.withArgs('is_private').returns(false);

            await ActivityPubServiceWrapper.init();

            // Reset call counts
            mockActivityPubService.enable.resetHistory();
            mockActivityPubService.disable.resetHistory();
            mockActivityPubService.removeWebhooks.resetHistory();
            mockActivityPubService.initialiseWebhooks.resetHistory();

            // Simulate is_private enabled
            mockSettingsCache.get.withArgs('is_private').returns(true);
            await eventHandlers['settings.is_private.edited']();

            assert.ok(mockActivityPubService.removeWebhooks.notCalled, 'removeWebhooks() should not be called');
            assert.ok(mockActivityPubService.disable.notCalled, 'disable() should not be called');
        });
    });

    describe('Runtime transitions - social_web changes', function () {
        it('does not create webhooks when social_web becomes true while private', async function () {
            mockSettingsCache.get.withArgs('social_web_enabled').returns(false);
            mockSettingsCache.get.withArgs('is_private').returns(true);

            await ActivityPubServiceWrapper.init();

            // Reset
            mockActivityPubService.enable.resetHistory();

            // Simulate social_web enabled while is_private is enabled
            mockSettingsCache.get.withArgs('social_web_enabled').returns(true);
            await eventHandlers['settings.social_web.edited']();

            assert.ok(mockActivityPubService.enable.notCalled, 'enable() should not be called');
            assert.ok(ActivityPubServiceWrapper.initialised, 'initialised should be true');
        });

        it('calls disable() when social_web becomes false', async function () {
            mockSettingsCache.get.withArgs('social_web_enabled').returns(true);
            mockSettingsCache.get.withArgs('is_private').returns(false);

            await ActivityPubServiceWrapper.init();

            // Reset
            mockActivityPubService.disable.resetHistory();

            // Simulate social_web disabled
            mockSettingsCache.get.withArgs('social_web_enabled').returns(false);
            await eventHandlers['settings.social_web.edited']();

            assert.ok(mockActivityPubService.disable.calledOnce, 'disable() should be called');
            assert.ok(!ActivityPubServiceWrapper.initialised, 'initialised should be false');
        });

        it('calls disable() when social_web becomes false while private', async function () {
            mockSettingsCache.get.withArgs('social_web_enabled').returns(true);
            mockSettingsCache.get.withArgs('is_private').returns(true);

            await ActivityPubServiceWrapper.init();

            // Reset
            mockActivityPubService.disable.resetHistory();

            // Simulate social_web disabled while is_private is enabled
            mockSettingsCache.get.withArgs('social_web_enabled').returns(false);
            await eventHandlers['settings.social_web.edited']();

            assert.ok(mockActivityPubService.disable.calledOnce, 'disable() should be called');
            assert.ok(!ActivityPubServiceWrapper.initialised, 'initialised should be false');
        });
    });
});
