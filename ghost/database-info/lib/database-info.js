module.exports = class DatabaseInfo {
    /**
     * @param {import('knex')} knex
     */
    constructor(knex) {
        this.knex = knex;
        this.client = this.knex.client;
        this.driver = this.client.config.client;

        this.databaseDetails = {
            // The underlying driver that `knex` uses
            // ie. `sqlite3`, `mysql` or `mysql2`
            driver: this.driver,

            // A capitalized version of the specific database used
            database: 'unknown',

            // A slugified version of the `database`
            engine: 'unknown',

            // The version of the database used
            version: 'unknown'
        };
    }

    async init() {
        switch (this.driver) {
        case 'sqlite3':
            this.databaseDetails.database = 'SQLite';
            this.databaseDetails.engine = 'sqlite3';
            this.databaseDetails.version = this.client.driver.VERSION;
            break;
        case 'mysql':
        case 'mysql2':
            try {
                const version = await this.knex.raw('SELECT version() as version;');
                const mysqlVersion = version[0][0].version;

                if (mysqlVersion.includes('MariaDB')) {
                    this.databaseDetails.database = 'MariaDB';
                    this.databaseDetails.engine = 'mariadb';
                    this.databaseDetails.version = mysqlVersion.split('-')[0];
                } else {
                    this.databaseDetails.database = 'MySQL';

                    if (mysqlVersion.startsWith('5')) {
                        this.databaseDetails.engine = 'mysql5';
                    } else if (mysqlVersion.startsWith('8')) {
                        this.databaseDetails.engine = 'mysql8';
                    } else {
                        this.databaseDetails.engine = 'mysql';
                    }

                    this.databaseDetails.version = mysqlVersion;
                }
            } catch (err) {
                return this.databaseDetails;
            }
            break;
        default:
            // This driver isn't supported so we should just leave the return
            // object alone with the "unknown" strings
            break;
        }

        return this.databaseDetails;
    }

    getDriver() {
        return this.databaseDetails.driver;
    }

    getDatabase() {
        return this.databaseDetails.database;
    }

    getEngine() {
        return this.databaseDetails.engine;
    }

    getVersion() {
        return this.databaseDetails.version;
    }

    isSqlite() {
        return this.databaseDetails.database === 'SQLite';
    }

    isMysql() {
        return this.databaseDetails.database === 'MySQL';
    }

    isMariadb() {
        return this.databaseDetails.database === 'MariaDB';
    }
};
