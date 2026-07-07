const config = require('../../shared/config');
const db = require('../data/db');
const createFacade = require('../../shared/container/create-facade');
const createLimitService = require('./create-limit-service');

module.exports = createFacade('limits', () => createLimitService({
    getHostSettings: () => config.get('hostSettings'),
    db
}));
