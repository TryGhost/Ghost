const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const DatabaseStateManager = require('../../../core/server/data/db/database-state-manager');
const createConnection = require('../../../core/server/data/db/create-connection');
const config = require('../../../core/shared/config');
const ghostVersion = require('@tryghost/version');

describe('DatabaseStateManager', function () {
    it('initialises an arbitrary database given explicit config', async function () {
        const filename = path.join(os.tmpdir(), `dsm-test-${process.pid}-${Date.now()}.db`);
        const stateManager = new DatabaseStateManager({
            knexMigratorConfig: {
                currentVersion: ghostVersion.safe,
                database: {
                    client: 'better-sqlite3',
                    connection: {filename}
                },
                migrationPath: config.get('paths:migrationPath')
            }
        });

        try {
            await stateManager.makeReady();

            const knex = createConnection({
                client: 'better-sqlite3',
                connection: {filename}
            });
            try {
                const migrations = await knex('migrations').count('id as total');
                assert.ok(migrations[0].total > 0, 'expected the isolated database to be initialised');
            } finally {
                await knex.destroy();
            }
        } finally {
            fs.rmSync(filename, {force: true});
        }
    }, 60000);
});
