// Utility Packages
const path = require('path');

// Ghost Internals
const routingService = require('../../../../core/frontend/services/routing');
const settingsCache = require('../../../../core/shared/settings-cache');
const imageLib = require('../../../../core/server/lib/image');

const boot = require('../../../../core/boot');

// Other Test Utilities
const configUtils = require('../../../utils/configUtils');
const urlServiceUtils = require('../../../utils/url-service-utils');

module.exports = {
    overrideGhostConfig: (utils) => {
        utils.set('paths:contentPath', path.join(__dirname, '../../../utils/fixtures'));
        utils.set('times:getImageSizeTimeoutInMS', 1);
    },

    defaultMocks: (sandbox, options) => {
        options = options || {};

        configUtils.set('paths:contentPath', path.join(__dirname, '../../../utils/fixtures'));

        const cacheStub = sandbox.stub(settingsCache, 'get');

        cacheStub.withArgs('active_theme').returns(options.theme || 'casper');
        cacheStub.withArgs('timezone').returns('Etc/UTC');
        cacheStub.withArgs('permalinks').returns('/:slug/');
        cacheStub.withArgs('ghost_private_key').returns('-----BEGIN RSA PRIVATE KEY-----\nMB8CAQACAgPBAgMBAAECAgMFAgEfAgEfAgEXAgEXAgEA\n-----END RSA PRIVATE KEY-----\n');
        cacheStub.withArgs('ghost_public_key').returns('-----BEGIN RSA PUBLIC KEY-----\nMAkCAgPBAgMBAAE=\n-----END RSA PUBLIC KEY-----\n');

        if (options.amp) {
            cacheStub.withArgs('amp').returns(true);
        }

        sandbox.stub(imageLib.imageSize, 'getImageSizeFromUrl').resolves();
    },

    /**
     * This is a really rough frontend-only version of Ghost boot
     * In order for this test pattern to be really considered the right pattern this needs to be replaced
     * With something based on the real boot
     * @returns {object} express App
     */
    initGhost: async (options = {}) => {
        const app = await boot(Object.assign({
            server: false,
            backend: false
        }, options));

        await urlServiceUtils.isFinished();

        return app;
    },

    routing: {
        reset: function () {
            routingService.registry.resetAll();
        }
    },

    urlService: urlServiceUtils
};
