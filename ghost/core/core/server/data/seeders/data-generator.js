const path = require('path');
const fs = require('fs/promises');
const JsonImporter = require('./utils/json-importer');
const {getProcessRoot} = require('@tryghost/root-utils');
const topologicalSort = require('./utils/topological-sort');
const {faker} = require('@faker-js/faker');
const {faker: americanFaker} = require('@faker-js/faker/locale/en_US');
const crypto = require('crypto');
const {Buffer} = require('node:buffer');
const DatabaseInfo = require('@tryghost/database-info');
const errors = require('@tryghost/errors');
const importers = require('./importers').reduce((acc, val) => {
    acc[val.table] = val;
    return acc;
}, {});

class DataGenerator {
    /**
     *
     * @param {object} options
     * @param {Record<string,number>} [options.quantities] Pass in custom amounts for specific tables
     * @param {number} [options.seed] If you pass the same seed, the same data will be generated if you used the same options too and if the data generation code remained the same.
     */
    constructor({
        knex,
        tables,
        schemaTables,
        clearDatabase = false,
        baseDataPack = '',
        baseUrl,
        logger,
        printDependencies,
        withDefault,
        seed,
        quantities = {},
        useTransaction = true
    }) {
        this.knex = knex;
        this.tableList = tables || [];
        this.schemaTables = schemaTables;
        this.willClearData = clearDatabase;
        this.useBaseDataPack = baseDataPack !== '';
        this.baseDataPack = baseDataPack;
        this.baseUrl = baseUrl;
        this.logger = logger;
        this.withDefault = withDefault;
        this.printDependencies = printDependencies;
        this.seed = seed;
        this.quantities = quantities;
        this.useTransaction = useTransaction;
    }

    sortTableList() {
        // Add missing dependencies
        for (const table of this.tableList) {
            table.importer = importers[table.name];

            // eslint-disable-next-line no-unused-vars
            table.dependencies = Object.entries(this.schemaTables[table.name]).reduce((acc, [_col, data]) => {
                if (data.references) {
                    const referencedTable = data.references.split('.')[0];
                    // The ghost_subscriptions_id property has a foreign key to the subscriptions table, but we don't use that table yet atm, so don't add it as a dependency
                    if (!acc.includes(referencedTable) && referencedTable !== 'subscriptions') {
                        acc.push(referencedTable);
                    }
                }
                return acc;
            }, table.importer.dependencies);

            for (const dependency of table.dependencies) {
                if (!this.tableList.find(t => t.name === dependency)) {
                    this.tableList.push({
                        name: dependency,
                        importer: importers[dependency]
                    });
                }
            }
        }

        // Order to ensure dependencies are created before dependants
        this.tableList = topologicalSort(this.tableList);
    }

    /**
     * TODO: This needs to reverse through all dependency chains to clear data from all tables
     * @param {import('knex/types').Knex.Transaction} transaction
     */
    async clearData(transaction) {
        const tables = this.tableList.map(t => t.name).reverse();

        const ownerUser = await transaction('roles_users')
            .join('roles', 'roles.id', 'roles_users.role_id')
            .where('roles.name', 'Owner')
            .first();

        if (!ownerUser) {
            this.logger.warn('Owner user not found, selective user clearing will not be possible');
        }

        // TODO: Remove this once we import posts_meta
        tables.unshift('posts_meta');

        // Clear data from any tables that are being imported
        for (const table of tables) {
            this.logger.debug(`Clearing table ${table}`);

            if (table === 'roles_users') {
                await transaction(table).del().whereNot('user_id', ownerUser?.user_id || null);
            } else if (table === 'users') {
                // Avoid deleting the admin user
                await transaction(table).del().whereNot('id', ownerUser?.user_id || null);
            } else {
                await transaction(table).truncate();
            }
        }
    }

    async importBasePack(transaction) {
        let baseDataPack = this.baseDataPack;
        if (!path.isAbsolute(this.baseDataPack)) {
            baseDataPack = path.join(getProcessRoot(), baseDataPack);
        }
        let baseData = {};
        try {
            baseData = JSON.parse((await fs.readFile(baseDataPack)).toString());
            this.logger.info('Read base data pack');
        } catch (error) {
            this.logger.error('Failed to read data pack: ', error);
            throw error;
        }

        this.logger.info('Starting base data import');
        const jsonImporter = new JsonImporter(transaction);

        // Clear settings table
        await transaction('settings').del();

        // Hard-coded for order
        const tablesToImport = [
            'newsletters',
            'posts',
            'tags',
            'products',
            'benefits',
            'products_benefits',
            'stripe_products',
            'stripe_prices',
            'settings',
            'custom_theme_settings'
        ];
        for (const table of tablesToImport) {
            this.logger.info(`Importing content for table ${table} from base data pack`);
            await jsonImporter.import({
                name: table,
                data: baseData[table]
            });
            const tableIndex = this.tableList.findIndex(t => t.name === table);
            if (tableIndex !== -1) {
                this.tableList.splice(tableIndex, 1);
            }
        }

        this.logger.info('Completed base data import');
    }

    async importData() {
        const start = Date.now();

        // Add default tables if none are specified
        if (this.tableList.length === 0) {
            this.tableList = Object.keys(importers).map(name => ({name}));
        } else if (this.withDefault) {
        // Add default tables to the end of the list
            const defaultTables = Object.keys(importers).map(name => ({name}));
            for (const table of defaultTables) {
                if (!this.tableList.find(t => t.name === table.name)) {
                    this.tableList.push(table);
                }
            }
        }

        // Error if we have an unknown table
        for (const table of this.tableList) {
            if (importers[table.name] === undefined) {
                throw new errors.IncorrectUsageError({message: `Unknown table: ${table.name}`});
            }
        }

        this.sortTableList();

        if (this.printDependencies) {
            this.logger.info('Table dependencies:');
            for (const table of this.tableList) {
                this.logger.info(`\t${table.name}: ${table.dependencies.join(', ')}`);
            }
            process.exit(0);
        }

        if (this.useTransaction) {
            await this.knex.transaction(async (transaction) => {
                if (!DatabaseInfo.isSQLite(this.knex)) {
                    await transaction.raw('SET autocommit=0;');
                }

                await this.#run(transaction);
            }, {isolationLevel: 'read committed'});
        } else {
            await this.#run(this.knex);
        }

        this.logger.info(`Completed data import in ${((Date.now() - start) / 1000).toFixed(1)}s`);
    }

    async #run(transaction) {
        if (!DatabaseInfo.isSQLite(this.knex)) {
            if (process.env.DISABLE_FAST_IMPORT) {
                await transaction.raw('SET FOREIGN_KEY_CHECKS=0;');
                await transaction.raw('SET unique_checks=0;');
            } else {
                await transaction.raw('ALTER INSTANCE DISABLE INNODB REDO_LOG;');
                await transaction.raw('SET FOREIGN_KEY_CHECKS=0;');
                await transaction.raw('SET unique_checks=0;');
                await transaction.raw('SET GLOBAL local_infile=1;');
            }
        }

        if (this.willClearData) {
            await this.clearData(transaction);
        }

        if (this.useBaseDataPack) {
            await this.importBasePack(transaction);
        }

        // Set quantities for tables
        for (const table of this.tableList) {
            if (this.quantities[table.name] !== undefined) {
                table.quantity = this.quantities[table.name];
            }
        }

        const cryptoRandomBytes = crypto.randomBytes;

        if (this.seed) {
            // The probality distributions library uses crypto.randomBytes, which we can't seed, so we need to override it
            crypto.randomBytes = (size) => {
                const buffer = Buffer.alloc(size);
                for (let i = 0; i < size; i++) {
                    buffer[i] = Math.floor(faker.datatype.number({min: 0, max: 255}));
                }
                return buffer;
            };
        }

        try {
            for (const table of this.tableList) {
                if (this.seed) {
                    // We reset the seed for every table, so the chosen tables don't affect the data and changes in one importer don't affect the others
                    faker.seed(this.seed);
                    americanFaker.seed(this.seed);
                }

                // Add all common options to every importer, whether they use them or not
                const tableImporter = new table.importer(this.knex, transaction, {
                    baseUrl: this.baseUrl
                });

                const amount = table.quantity ?? tableImporter.defaultQuantity;
                this.logger.info('Importing content for table', table.name, amount ? `(${amount} records)` : '');

                await tableImporter.import(table.quantity ?? undefined);
            }
        } finally {
            if (this.seed) {
                // Revert crypto.randomBytes to the original function
                crypto.randomBytes = cryptoRandomBytes;
            }
        }

        // Finalise all tables - uses new table importer objects to avoid keeping all data in memory
        for (const table of this.tableList) {
            const tableImporter = new table.importer(this.knex, transaction, {
                baseUrl: this.baseUrl
            });
            await tableImporter.finalise();
        }

        // Re-enable the redo log because it's a persisted global
        // Leaving it disabled can break the database in the event of an unexpected shutdown
        // See https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html#innodb-disable-redo-logging
        if (!DatabaseInfo.isSQLite(this.knex) && !process.env.DISABLE_FAST_IMPORT) {
            await transaction.raw('ALTER INSTANCE ENABLE INNODB REDO_LOG;');
        }
    }
}

module.exports = DataGenerator;
