const connection = require('./connection');
const DatabaseInfo = require('./database-info');

module.exports = new DatabaseInfo(connection);
