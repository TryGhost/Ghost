// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const Knex = require('knex');
const DatabaseInfo = require('../');

describe('DatabaseInfo', function () {
    it('should export a class', function () {
        DatabaseInfo.should.be.a.class;
    });

    it('can construct the class', function () {
        const knex = Knex({
            client: 'sqlite3'
        });

        const databaseInfo = new DatabaseInfo(knex);
        databaseInfo.should.be.an.instanceOf(DatabaseInfo);
    });

    it('recognises sqlite3 client is SQLite', function () {
        const knex = Knex({
            client: 'sqlite3'
        });

        DatabaseInfo.isSQLite(knex).should.be.true();
    });

    it('recognises better-sqlite3 client is SQLite', function () {
        const knex = Knex({
            client: 'better-sqlite3'
        });

        DatabaseInfo.isSQLite(knex).should.be.true();
    });

    it('recognises mysql client is MySQL', function () {
        const knex = Knex({
            client: 'mysql'
        });

        DatabaseInfo.isMySQL(knex).should.be.true();
    });

    it('recognises mysql2 client is MySQL', function () {
        const knex = Knex({
            client: 'mysql2'
        });

        DatabaseInfo.isMySQL(knex).should.be.true();
    });
});
