const Dialect = require(`knex/lib/dialects/sqlite3/index`);
Dialect.prototype._driver = () => require('sqlite3');

module.exports = Dialect;
