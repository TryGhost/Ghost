let instance;

// Lazily construct the service so it picks up the live knex connection and
// urlUtils singleton on first use, without needing a boot-time registration.
module.exports = {
    get api() {
        if (!instance) {
            const MediaInventoryService = require('./media-inventory-service');
            const db = require('../../data/db');
            const urlUtils = require('../../../shared/url-utils');

            instance = new MediaInventoryService({
                knex: db.knex,
                urlUtils
            });
        }

        return instance;
    }
};
