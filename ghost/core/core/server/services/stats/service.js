class StatsServiceWrapper {
    constructor() {
        this.api = null;
        this.cache = null;
    }

    async init() {
        if (this.api) {
            // Already done
            return;
        }

        const StatsService = require('./StatsService');
        const db = require('../../data/db');

        this.api = StatsService.create({knex: db.knex});

        const adapterManager = require('../adapter-manager');
        const config = require('../../../shared/config');

        if (config.get('hostSettings:statsCache:enabled')) {
            this.cache = adapterManager.getAdapter('cache:stats');
        }
    }
}

module.exports = new StatsServiceWrapper();
