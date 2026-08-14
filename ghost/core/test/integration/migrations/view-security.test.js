const assert = require('node:assert/strict');
const testUtils = require('../../utils');
const db = require('../../../core/server/data/db');
const commands = require('../../../core/server/data/schema/commands');
const views = require('../../../core/server/data/schema/views');
const repairMigration = require('../../../core/server/data/migrations/versions/6.50/2026-06-30-09-00-00-set-members-resolved-subscription-view-security-invoker');

// SQLite has no SQL SECURITY / DEFINER concept, so this only applies to MySQL.
const isMySQL = (process.env.NODE_ENV || '').includes('mysql');

async function securityType(viewName) {
    const [rows] = await db.knex.raw(`
        SELECT security_type
        FROM information_schema.views
        WHERE table_schema = DATABASE()
        AND table_name = ?
    `, [viewName]);
    return rows[0] && rows[0].SECURITY_TYPE;
}

describe('Migrations - view security', function () {
    beforeAll(async function () {
        await testUtils.startGhost();
    });

    // Fresh installs create views through the init path, which now routes
    // through createViewOrReplace, so the shipped view must be INVOKER.
    it.runIf(isMySQL)('ships members_resolved_subscription with SQL SECURITY INVOKER', async function () {
        assert.equal(await securityType('members_resolved_subscription'), 'INVOKER');
    });

    // Existing installs are repaired by the versioned migration. Reproduce the
    // pre-6.50 state (MySQL's default SQL SECURITY DEFINER) on the real view,
    // then run the actual migration and assert it flips to INVOKER. A valid
    // (current-user) definer keeps the view queryable so the migration, not a
    // broken precondition, is what is under test.
    it.runIf(isMySQL)('the 6.50 migration converts an existing DEFINER view to INVOKER', async function () {
        await db.knex.raw('CREATE OR REPLACE SQL SECURITY DEFINER VIEW `members_resolved_subscription` AS ' + views.members_resolved_subscription);
        assert.equal(await securityType('members_resolved_subscription'), 'DEFINER', 'precondition: view should be DEFINER before the migration');

        await repairMigration.up({connection: db.knex});

        assert.equal(await securityType('members_resolved_subscription'), 'INVOKER');
    });

    // Demonstrates the user-visible failure and that the helper fixes it: a
    // DEFINER-bound view whose definer account is absent — what a dump restored
    // onto a different server looks like — errors at query time (1449) until the
    // helper recreates it with INVOKER.
    it.runIf(isMySQL)('recovers a view whose DEFINER account is absent', async function () {
        const viewName = 'ber3756_view_security_demo';
        const viewSql = 'SELECT 1 AS one';

        try {
            await db.knex.raw('CREATE OR REPLACE DEFINER=`ghost_absent`@`10.255.255.1` SQL SECURITY DEFINER VIEW ?? AS ' + viewSql, [viewName]);

            await assert.rejects(
                db.knex.raw('SELECT * FROM ??', [viewName]),
                err => /definer/i.test(err.message) || err.errno === 1449,
                'a DEFINER-bound view with a missing account should be unusable'
            );

            await commands.createViewOrReplace(viewName, viewSql, db.knex);

            const [rows] = await db.knex.raw('SELECT * FROM ??', [viewName]);
            assert.equal(rows[0].one, 1);
        } finally {
            await db.knex.raw('DROP VIEW IF EXISTS ??', [viewName]);
        }
    });
});
