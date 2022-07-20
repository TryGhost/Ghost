const StatsService = require('@tryghost/stats-service');
const db = require('../../data/db');

module.exports = StatsService.create({knex: db.knex});
