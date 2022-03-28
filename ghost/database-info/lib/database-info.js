module.exports = class DatabaseInfo {
    /**
     * @param {import('knex')} knex
     */
    constructor(knex) {
        this._knex = knex;
        this._client = this._knex.client;
        this._driver = this._client.config.client;

        this._databaseDetails = {
            // The underlying driver that `knex` uses
            // ie. `sqlite3`, `mysql` or `mysql2`
            driver: this._driver,

            // A capitalized version of the specific database used
            database: 'unknown',

            // A slugified version of the `database`
            engine: 'unknown',

            // The version of the database used
            version: 'unknown'
        };
    }

    async init() {
        switch (this._driver) {
        case 'sqlite3':
            this._databaseDetails.database = 'SQLite';
            this._databaseDetails.engine = 'sqlite3';
            this._databaseDetails.version = this._client.driver.VERSION;
            break;
        case 'mysql':
        case 'mysql2':
            try {
                const version = await this._knex.raw('SELECT version() as version;');
                const mysqlVersion = version[0][0].version;

                if (mysqlVersion.includes('MariaDB')) {
                    this._databaseDetails.database = 'MariaDB';
                    this._databaseDetails.engine = 'mariadb';
                    this._databaseDetails.version = mysqlVersion.split('-')[0];
                } else {
                    this._databaseDetails.database = 'MySQL';

                    if (mysqlVersion.startsWith('5')) {
                        this._databaseDetails.engine = 'mysql5';
                    } else if (mysqlVersion.startsWith('8')) {
                        this._databaseDetails.engine = 'mysql8';
                    } else {
                        this._databaseDetails.engine = 'mysql';
                    }

                    this._databaseDetails.version = mysqlVersion;
                }
            } catch (err) {
                return this._databaseDetails;
            }
            break;
        default:
            // This driver isn't supported so we should just leave the return
            // object alone with the "unknown" strings
            break;
        }

        return this._databaseDetails;
    }

    getDriver() {
        return this._databaseDetails.driver;
    }

    getDatabase() {
        return this._databaseDetails.database;
    }

    getEngine() {
        return this._databaseDetails.engine;
    }

    getVersion() {
        return this._databaseDetails.version;
    }

    /**
     * Returns if the driver used is for SQLite
     *
     * @param {import('knex')} knex
     */
    static isSQLite(knex) {
        const driver = knex.client.config.client;
        return ['sqlite3', 'better-sqlite3'].includes(driver);
    }

    /**
     * Returns if the config is for SQLite
     *
     * @param {object} config
     */
    static isSQLiteConfig(config) {
        return ['sqlite3', 'better-sqlite3'].includes(config.client);
    }

    /**
     * Returns if the driver used is for MySQL
     *
     * @param {import('knex')} knex
     */
    static isMySQL(knex) {
        const driver = knex.client.config.client;
        return ['mysql', 'mysql2'].includes(driver);
    }

    /**
     * Returns if the config is for MySQL
     *
     * @param {object} config
     */
    static isMySQLConfig(config) {
        return ['mysql', 'mysql2'].includes(config.client);
    }
};
