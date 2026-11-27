const connection = require('./connection');
const DatabaseInfo = require('@tryghost/database-info');

module.exports = new DatabaseInfo(connection);
