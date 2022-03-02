const sqlite3 = require('./sqlite3');
const mysql = require('./mysql');

module.exports = {
    sqlite3: sqlite3,
    mysql: mysql, //TODO: remove this once we switch to `mysql2`
    mysql2: mysql
};
