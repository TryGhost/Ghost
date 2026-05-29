const GiftLinksService = require('./gift-links-service');

/**
 * Boot-time wrapper for the gift links service. Mirrors the comments /
 * recommendations service pattern: a singleton whose `init()` lazily wires in
 * the models so the module can be required without triggering model loading.
 */
class GiftLinksServiceWrapper {
    init() {
        if (this.api) {
            // Already initialised
            return;
        }

        const models = require('../../models');

        this.api = new GiftLinksService({models});
    }
}

module.exports = new GiftLinksServiceWrapper();
