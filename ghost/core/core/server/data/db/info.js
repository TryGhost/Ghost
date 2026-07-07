const db = require('./index');
const DatabaseInfo = require('@tryghost/database-info');

module.exports = new DatabaseInfo(db.knex);
