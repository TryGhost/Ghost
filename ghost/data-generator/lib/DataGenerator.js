const path = require('path');
const fs = require('fs/promises');
const JsonImporter = require('./utils/JsonImporter');
const {getProcessRoot} = require('@tryghost/root-utils');
const topologicalSort = require('./utils/topological-sort');

const importers = require('./importers').reduce((acc, val) => {
    acc[val.table] = val;
    return acc;
}, {});
const schema = require('../../core/core/server/data/schema').tables;

class DataGenerator {
    constructor({
        knex,
        tables,
        clearDatabase = false,
        baseDataPack = '',
        baseUrl,
        logger,
        withDefault
    }) {
        this.knex = knex;
        this.tableList = tables || [];
        this.willClearData = clearDatabase;
        this.useBaseDataPack = baseDataPack !== '';
        this.baseDataPack = baseDataPack;
        this.baseUrl = baseUrl;
        this.logger = logger;
        this.withDefault = withDefault;
    }

    sortTableList() {
        // Add missing dependencies
        for (const table of this.tableList) {
            table.importer = importers[table.name];
            // eslint-disable-next-line no-unused-vars
            table.dependencies = Object.entries(schema[table.name]).reduce((acc, [_col, data]) => {
                if (data.references) {
                    const referencedTable = data.references.split('.')[0];
                    if (!acc.includes(referencedTable)) {
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

        // TODO: Remove this once we import posts_meta
        tables.unshift('posts_meta');

        // Clear data from any tables that are being imported
        for (const table of tables) {
            this.logger.debug(`Clearing table ${table}`);

            if (table === 'roles_users') {
                await transaction(table).del().whereNot('user_id', '1');
            } else if (table === 'users') {
                // Avoid deleting the admin user
                await transaction(table).del().whereNot('id', '1');
            } else {
                await transaction(table).del();
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
            baseData = JSON.parse(await (await fs.readFile(baseDataPack)).toString());
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
        const transaction = await this.knex.transaction();

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
                // eslint-disable-next-line
                throw new Error(`Unknown table: ${table.name}`);
            }
        }

        this.sortTableList();

        if (this.willClearData) {
            await this.clearData(transaction);
        }

        if (this.useBaseDataPack) {
            await this.importBasePack(transaction);
        }

        for (const table of this.tableList) {
            this.logger.info('Importing content for table', table.name);
            // Add all common options to every importer, whether they use them or not
            const tableImporter = new table.importer(this.knex, transaction, {
                baseUrl: this.baseUrl
            });
            await tableImporter.import(table.quantity ?? undefined);
        }

        // Finalise all tables - uses new table importer objects to avoid keeping all data in memory
        for (const table of this.tableList) {
            const tableImporter = new table.importer(this.knex, transaction, {
                baseUrl: this.baseUrl
            });
            await tableImporter.finalise();
        }

        await transaction.commit();
    }
}

module.exports = DataGenerator;
