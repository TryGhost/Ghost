const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

const utils = require('../../../../../core/server/data/migrations/utils');

class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = async (val) => {
                resolve(val);
                return this.promise;
            };
            this.reject = async (val) => {
                reject(val);
                return this.promise;
            };
        });
    }
}

describe('migrations/utils', function () {
    describe('createTransactionalMigration', function () {
        it('Accepts two functions and creates a transactional migration from them', function () {
            const config = {
                transacting: {}
            };
            const up = sinon.spy();
            const down = sinon.spy();

            const migration = utils.createTransactionalMigration(up, down);
            const upResult = migration.up(config);
            const downResult = migration.down(config);

            assert(migration.config.transaction, 'Migration config should set transaction to true');

            assert(upResult instanceof Promise, 'Migration up method should return a Promise');
            assert(downResult instanceof Promise, 'Migration down method should return a Promise');

            assert(up.calledOnceWith(config.transacting), 'up function should be called with transacting');
            assert(down.calledOnceWith(config.transacting), 'down function should be called with transacting');
        });
    });

    describe('combineTransactionalMigrations', function () {
        it('Accepts a number of migrations and returns a single migration', async function () {
            const config = {
                transacting: {}
            };
            const upA = sinon.stub().resolves();
            const downA = sinon.stub().resolves();
            const upB = sinon.stub().resolves();
            const downB = sinon.stub().resolves();

            const migrationA = utils.createTransactionalMigration(upA, downA);
            const migrationB = utils.createTransactionalMigration(upB, downB);
            const combinedMigration = utils.combineTransactionalMigrations(migrationA, migrationB);

            assert(combinedMigration.config.transaction, 'Migration config should set transaction to true');

            const upResult = combinedMigration.up(config);
            assert(upResult instanceof Promise, 'Migration up method should return a Promise');

            await upResult;
            assert(upA.calledOnceWith(config.transacting), 'first up fn should be called with transacting');
            assert(upB.calledOnceWith(config.transacting), 'second up fn should be called with transacting');
            assert(upA.calledBefore(upB), 'Migration up method should call child up methods in order');

            const downResult = combinedMigration.down(config);
            assert(downResult instanceof Promise, 'Migration down method should return a Promise');

            await downResult;
            assert(downA.calledOnceWith(config.transacting), 'first down fn should be called with transacting');
            assert(downB.calledOnceWith(config.transacting), 'second down fn should be called with transacting');
            assert(downB.calledBefore(downA), 'Migration down method should call child down methods in reverse order');
        });

        it('Waits for each migration to finish before executing the next', async function () {
            const config = {
                transacting: {}
            };
            const upDeferredA = new Deferred();
            const upDeferredB = new Deferred();
            const downDeferredA = new Deferred();
            const downDeferredB = new Deferred();

            const upA = sinon.stub().returns(upDeferredA.promise);
            const downA = sinon.stub().returns(downDeferredA.promise);
            const upB = sinon.stub().returns(upDeferredB.promise);
            const downB = sinon.stub().returns(downDeferredB.promise);

            const migrationA = utils.createTransactionalMigration(upA, downA);
            const migrationB = utils.createTransactionalMigration(upB, downB);
            const combinedMigration = utils.combineTransactionalMigrations(migrationA, migrationB);

            combinedMigration.up(config);

            assert(!upB.called, 'second up fn should not be called until first up fn has resolved');
            await upDeferredA.resolve();
            assert(upB.calledOnce, 'second up fn should be called once first up fn has resolved');

            combinedMigration.down(config);

            assert(!downA.called, 'penultimate down fn should not be called until last down fn has resolved');
            await downDeferredB.resolve();
            assert(downA.calledOnce, 'penultimate down fn should be called once last down fn has resolved');
        });

        it('Stops execution if a migration errors, and propagates error', async function () {
            const config = {
                transacting: {}
            };
            const upDeferredA = new Deferred();
            const upDeferredB = new Deferred();
            const downDeferredA = new Deferred();
            const downDeferredB = new Deferred();

            const upA = sinon.stub().returns(upDeferredA.promise);
            const downA = sinon.stub().returns(downDeferredA.promise);
            const upB = sinon.stub().returns(upDeferredB.promise);
            const downB = sinon.stub().returns(downDeferredB.promise);

            const migrationA = utils.createTransactionalMigration(upA, downA);
            const migrationB = utils.createTransactionalMigration(upB, downB);
            const combinedMigration = utils.combineTransactionalMigrations(migrationA, migrationB);

            const upResult = combinedMigration.up(config);

            assert(!upB.called, 'second up fn should not be called until first up fn has resolved');
            try {
                await upDeferredA.reject(new Error('some reason'));
            } catch (err) {
                //
            } finally {
                assert(!upB.called, 'second up fn should not be called if first up fn has rejected');
            }

            let upError = null;
            try {
                await upResult;
            } catch (err) {
                upError = true;
            } finally {
                assert(upError, 'Migration up should error if child errors');
            }

            const downResult = combinedMigration.down(config);

            assert(!downA.called, 'penultimate down fn should not be called until last down fn has resolved');
            try {
                await downDeferredB.reject(new Error('some reason'));
            } catch (err) {
                //
            } finally {
                assert(!downA.called, 'penultimate down fn should not be called if last down fn has rejected');
            }

            let downErr = null;
            try {
                await downResult;
            } catch (err) {
                downErr = err;
            } finally {
                assert(downErr, 'Migration down should error if child errors');
            }
        });
    });
});

const Knex = require('knex');
const ObjectId = require('bson-objectid').default;

async function setupPermissionsDb() {
    const knex = Knex({
        client: 'sqlite',
        connection: {
            filename: ':memory:'
        },
        // Suppress warnings from knex
        useNullAsDefault: true
    });

    await knex.raw(`
        CREATE TABLE \`permissions\` (
            \`id\` varchar(24) not null,
            \`name\` varchar(50) not null,
            \`object_type\` varchar(50) not null,
            \`action_type\` varchar(50) not null,
            \`object_id\` varchar(24) null,
            \`created_at\` datetime not null,
            \`updated_at\` datetime null,
            primary key (\`id\`)
        );
    `);
    await knex.raw(`CREATE UNIQUE INDEX \`permissions_name_unique\` on \`permissions\` (\`name\`);`);

    await knex.raw(`
        CREATE TABLE \`permissions_roles\` (
            \`id\` varchar(24) not null,
            \`role_id\` varchar(24) not null,
            \`permission_id\` varchar(24) not null,
            primary key (\`id\`)
        );
    `);

    await knex.raw(`
        CREATE TABLE \`roles\` (
            \`id\` varchar(24) not null,
            \`name\` varchar(50) not null,
            \`description\` varchar(2000) null,
            \`created_at\` datetime not null,
            \`updated_at\` datetime null,
            primary key (\`id\`)
        );
    `);
    await knex.raw(`CREATE UNIQUE INDEX \`roles_name_unique\` on \`roles\` (\`name\`);`);

    const date = knex.raw('CURRENT_TIMESTAMP');
    await knex('roles').insert({
        id: ObjectId().toHexString(),
        name: 'Role Name',
        description: 'Role description',
        created_at: date,
        updated_at: date
    });

    await knex('roles').insert({
        id: ObjectId().toHexString(),
        name: 'Other Role Name',
        description: 'Other Role description',
        created_at: date,
        updated_at: date
    });

    await knex('permissions').insert({
        id: ObjectId().toHexString(),
        name: 'Permission Name',
        action_type: 'action',
        object_type: 'object',
        created_at: date,
        updated_at: date
    });

    return knex;
}

async function setupSettingsDb() {
    const knex = Knex({
        client: 'sqlite',
        connection: {
            filename: ':memory:'
        },
        // Suppress warnings from knex
        useNullAsDefault: true
    });

    await knex.raw(`
        CREATE TABLE \`settings\` (
            \`id\` varchar(24) not null,
            \`key\` varchar(50) not null,
            \`value\` text null,
            \`group\` varchar(50) not null,
            \`type\` varchar(50) not null,
            \`flags\` varchar(50) null,
            \`created_at\` datetime not null,
            \`updated_at\` datetime null,
            primary key (\`id\`)
        );
    `);
    await knex.raw(`CREATE UNIQUE INDEX \`settings_key_unique\` on \`settings\` (\`key\`);`);

    return knex;
}

async function runUpMigration(knex, migration) {
    {
        const transacting = await knex.transaction();
        await migration.up({transacting});
        transacting.commit();
    }

    return async function runDownMigration() {
        const transacting = await knex.transaction();
        await migration.down({transacting});
        transacting.commit();
    };
}

describe('migrations/utils/permissions', function () {
    describe('addPermission', function () {
        it('Accepts a name, action and object and returns a migration which adds a permission to the database', async function () {
            const knex = await setupPermissionsDb();

            const migration = utils.addPermission({
                name: 'scarface',
                object: 'my little friend',
                action: 'say hello'
            });

            assert(migration.config.transaction, 'addPermission creates a transactional migration');

            const runDownMigration = await runUpMigration(knex, migration);

            const allPermissionsAfterUp = await knex('permissions').select();
            const insertedPermissionsAfterUp = allPermissionsAfterUp.filter((row) => {
                return row.name === 'scarface';
            });

            assert(insertedPermissionsAfterUp.length === 1, 'The permission was inserted into the database');

            await runDownMigration();

            const allPermissionsAfterDown = await knex('permissions').select();
            const insertedPermissionsAfterDown = allPermissionsAfterDown.filter((row) => {
                return row.name === 'scarface';
            });

            assert(insertedPermissionsAfterDown.length === 0, 'The permission was removed');
        });
    });

    describe('addPermissionToRole', function () {
        it('Accepts a permission name and role name and returns a migration which adds a permission to the database', async function () {
            const knex = await setupPermissionsDb();

            const migration = utils.addPermissionToRole({
                permission: 'Permission Name',
                role: 'Role Name'
            });

            const runDownMigration = await runUpMigration(knex, migration);

            const allPermissionsForRoleAfterUp = await knex.raw(`
                SELECT
                    p.name
                FROM
                    permissions p
                INNER JOIN
                    permissions_roles pr
                ON
                    pr.permission_id = p.id
                INNER JOIN
                    roles r
                ON
                    pr.role_id = r.id
                WHERE
                    r.name = 'Role Name';
            `);

            const attachedPermissionAfterUp = allPermissionsForRoleAfterUp.find((row) => {
                return row.name === 'Permission Name';
            });

            assert(attachedPermissionAfterUp, 'The permission was attached to the role.');

            await runDownMigration();

            const allPermissionsForRoleAfterDown = await knex.raw(`
                SELECT
                    p.name
                FROM
                    permissions p
                INNER JOIN
                    permissions_roles pr
                ON
                    pr.permission_id = p.id
                INNER JOIN
                    roles r
                ON
                    pr.role_id = r.id
                WHERE
                    r.name = 'Role Name';
            `);

            const attachedPermissionAfterDown = allPermissionsForRoleAfterDown.find((row) => {
                return row.name === 'Permission Name';
            });

            assert(!attachedPermissionAfterDown, 'The permission was removed from the role.');
        });

        describe('Throws errors', function () {
            it('Throws when permission cannot be found in up migration', async function () {
                const knex = await setupPermissionsDb();

                const migration = utils.addPermissionToRole({
                    permission: 'Unimaginable',
                    role: 'Not there'
                });

                try {
                    await runUpMigration(knex, migration);
                    assert.fail('addPermissionToRole up migration did not throw');
                } catch (err) {
                    assert.equal(errors.utils.isGhostError(err), true);
                    assert.equal(err.message, 'Cannot add permission(Unimaginable) with role(Not there) - permission does not exist');
                }
            });

            it('Does not throw when permission cannot be found in down migration', async function () {
                const knex = await setupPermissionsDb();

                const migration = utils.addPermissionToRole({
                    permission: 'Permission Name',
                    role: 'Role Name'
                });

                const runDownMigration = await runUpMigration(knex, migration);
                await knex('permissions')
                    .where('name', '=', 'Permission Name')
                    .del();

                await runDownMigration(knex, migration);
            });

            it('Throws when role cannot be found', async function () {
                const knex = await setupPermissionsDb();

                const migration = utils.addPermissionToRole({
                    permission: 'Permission Name',
                    role: 'Not there'
                });

                try {
                    await runUpMigration(knex, migration);
                    assert.fail('addPermissionToRole did not throw');
                } catch (err) {
                    assert.equal(errors.utils.isGhostError(err), true);
                    assert.equal(err.message, 'Cannot add permission(Permission Name) with role(Not there) - role does not exist');
                }
            });

            it('Does not throw when role cannot be found in down migration', async function () {
                const knex = await setupPermissionsDb();

                const migration = utils.addPermissionToRole({
                    permission: 'Permission Name',
                    role: 'Role Name'
                });

                const runDownMigration = await runUpMigration(knex, migration);
                await knex('roles')
                    .where('name', '=', 'Role Name')
                    .del();

                await runDownMigration(knex, migration);
            });
        });
    });

    describe('addPermissionWithRoles', function () {
        it('Accepts addPermission config and a list of roles, and creates the permission, linking it to roles', async function () {
            const knex = await setupPermissionsDb();

            const migration = utils.addPermissionWithRoles({
                name: 'scarface',
                object: 'my little friend',
                action: 'say hello'
            }, [
                'Role Name',
                'Other Role Name'
            ]);

            const runDownMigration = await runUpMigration(knex, migration);

            const allPermissionsAfterUp = await knex('permissions').select();
            const insertedPermissionsAfterUp = allPermissionsAfterUp.filter((row) => {
                return row.name === 'scarface';
            });

            assert(insertedPermissionsAfterUp.length === 1, 'The permission was inserted into the database');

            const allPermissionsForRoleAfterUp = await knex.raw(`
                SELECT
                    p.name
                FROM
                    permissions p
                INNER JOIN
                    permissions_roles pr
                ON
                    pr.permission_id = p.id
                INNER JOIN
                    roles r
                ON
                    pr.role_id = r.id
                WHERE
                    r.name = 'Role Name';
            `);

            const permissionAttachedToRoleAfterUp = allPermissionsForRoleAfterUp.find((row) => {
                return row.name === 'scarface';
            });

            assert(permissionAttachedToRoleAfterUp, 'The permission was attached to the role.');

            await knex.raw(`
                SELECT
                    p.name
                FROM
                    permissions p
                INNER JOIN
                    permissions_roles pr
                ON
                    pr.permission_id = p.id
                INNER JOIN
                    roles r
                ON
                    pr.role_id = r.id
                WHERE
                    r.name = 'Other Role Name';
            `);

            const permissionAttachedToOtherRoleAfterUp = allPermissionsForRoleAfterUp.find((row) => {
                return row.name === 'scarface';
            });

            assert(permissionAttachedToOtherRoleAfterUp, 'The permission was attached to the other role.');

            await runDownMigration();

            const allPermissionsAfterDown = await knex('permissions').select();
            const insertedPermissionsAfterDown = allPermissionsAfterDown.filter((row) => {
                return row.name === 'scarface';
            });

            assert(insertedPermissionsAfterDown.length === 0, 'The permission was removed from the database');

            const allPermissionsForRoleAfterDown = await knex.raw(`
                SELECT
                    p.name
                FROM
                    permissions p
                INNER JOIN
                    permissions_roles pr
                ON
                    pr.permission_id = p.id
                INNER JOIN
                    roles r
                ON
                    pr.role_id = r.id
                WHERE
                    r.name = 'Role Name';
            `);

            const permissionAttachedToRoleAfterDown = allPermissionsForRoleAfterDown.find((row) => {
                return row.name === 'scarface';
            });

            assert(!permissionAttachedToRoleAfterDown, 'The permission was removed from the role.');

            const allPermissionsForOtherRoleAfterDown = await knex.raw(`
                SELECT
                    p.name
                FROM
                    permissions p
                INNER JOIN
                    permissions_roles pr
                ON
                    pr.permission_id = p.id
                INNER JOIN
                    roles r
                ON
                    pr.role_id = r.id
                WHERE
                    r.name = 'Other Role Name';
            `);

            const permissionAttachedToOtherRoleAfterDown = allPermissionsForOtherRoleAfterDown.find((row) => {
                return row.name === 'scarface';
            });

            assert(!permissionAttachedToOtherRoleAfterDown, 'The permission was removed from the other role.');
        });
    });
});

describe('migrations/utils/settings', function () {
    describe('addSetting', function () {
        it('Accepts a setting spec and returns a migration which adds a setting to the database', async function () {
            const knex = await setupSettingsDb();

            const migration = utils.addSetting({
                key: 'test_key',
                value: 'test_value',
                type: 'string',
                group: 'test_group',
                flags: 'PUBLIC'
            });

            const runDownMigration = await runUpMigration(knex, migration);

            const allSettingsAfterUp = await knex('settings').select();
            const addedSettingAfterUp = allSettingsAfterUp.find((row) => {
                return row.key === 'test_key';
            });

            assert.equal(addedSettingAfterUp.key, 'test_key', 'The setting was added to the database');
            assert.equal(addedSettingAfterUp.value, 'test_value');
            assert.equal(addedSettingAfterUp.type, 'string');
            assert.equal(addedSettingAfterUp.group, 'test_group');
            assert.equal(addedSettingAfterUp.flags, 'PUBLIC');

            await runDownMigration();

            const allSettingsAfterDown = await knex('settings').select();

            assert.equal(allSettingsAfterDown.length, 0, 'The setting was removed');
        });

        it('Skips adding if setting already exists', async function () {
            const knex = await setupSettingsDb();

            // First add a setting
            const firstMigration = utils.addSetting({
                key: 'test_key',
                value: 'test_value',
                type: 'string',
                group: 'test_group',
                flags: 'PUBLIC'
            });

            await runUpMigration(knex, firstMigration);

            // Try to add the same setting again
            const secondMigration = utils.addSetting({
                key: 'test_key',
                value: 'new_value',
                type: 'string',
                group: 'test_group',
                flags: 'PUBLIC'
            });

            const runDownMigration = await runUpMigration(knex, secondMigration);

            const allSettingsAfterUp = await knex('settings').select();
            const existingSetting = allSettingsAfterUp.find((row) => {
                return row.key === 'test_key';
            });

            assert.equal(existingSetting.value, 'test_value', 'The original value was preserved');

            await runDownMigration();

            const allSettingsAfterDown = await knex('settings').select();

            assert.equal(allSettingsAfterDown.length, 0, 'The setting was removed');
        });
    });

    describe('removeSetting', function () {
        it('Accepts a key and returns a migration which removes a setting from the database', async function () {
            const knex = await setupSettingsDb();

            await knex('settings').insert({
                id: ObjectId().toHexString(),
                key: 'remove_test_key',
                value: 'test_value',
                type: 'string',
                group: 'test_group',
                flags: 'PUBLIC',
                created_at: knex.raw('CURRENT_TIMESTAMP')
            });

            const allSettingsAtStart = await knex('settings').select();

            const migration = utils.removeSetting('remove_test_key');
            const runDownMigration = await runUpMigration(knex, migration);

            const allSettingsAfterUp = await knex('settings').select();

            await runDownMigration();

            const allSettingsAfterDown = await knex('settings').select();
            const restoredSettingAfterDown = allSettingsAfterDown.find((row) => {
                return row.key === 'remove_test_key';
            });

            assert.equal(allSettingsAtStart.length, 1, 'Started with one setting');
            assert.equal(allSettingsAfterUp.length, 0, 'Setting was removed');
            assert.equal(allSettingsAfterDown.length, 1, 'Ended with one setting');
            assert.equal(restoredSettingAfterDown.key, 'remove_test_key', 'Setting was restored');
        });

        it('Skips removal if setting does not exist', async function () {
            const knex = await setupSettingsDb();

            const allSettingsAtStart = await knex('settings').select();

            const migration = utils.removeSetting('non_existent_key');

            const runDownMigration = await runUpMigration(knex, migration);

            const allSettingsAfterUp = await knex('settings').select();

            await runDownMigration();

            const allSettingsAfterDown = await knex('settings').select();

            assert.equal(allSettingsAtStart.length, 0, 'No settings in place at the start');
            assert.equal(allSettingsAfterUp.length, 0, 'No settings were removed');
            assert.equal(allSettingsAfterDown.length, 0, 'No settings were restored');
        });
    });
});

async function setupNullableTestDb() {
    const knex = Knex({
        client: 'sqlite3',
        connection: {
            filename: ':memory:'
        },
        useNullAsDefault: true
    });

    // Create test table with mixed nullable/not-nullable columns
    await knex.raw(`
        CREATE TABLE test_nullable_migration (
            id INTEGER PRIMARY KEY,
            nullable_col TEXT NULL,
            not_nullable_col TEXT NOT NULL,
            mixed_col TEXT NOT NULL
        );
    `);

    // Insert test data
    await knex('test_nullable_migration').insert({
        id: 1,
        nullable_col: 'test',
        not_nullable_col: 'required',
        mixed_col: 'data'
    });

    return knex;
}

// Helper function to check column nullable status for SQLite
async function checkColumnNullable(table, column, knex) {
    const response = await knex.raw(`PRAGMA table_info(??)`, [table]);
    const columnInfo = response.find(col => col.name === column);
    return columnInfo ? columnInfo.notnull === 0 : null;
}

describe('migrations/utils/schema nullable functions', function () {
    describe('createSetNullableMigration', function () {
        it('Sets a not-nullable column to nullable', async function () {
            const knex = await setupNullableTestDb();

            const migration = utils.createSetNullableMigration('test_nullable_migration', 'not_nullable_col');

            assert(migration.config.transaction, 'createSetNullableMigration creates a transactional migration');

            // Verify initial state - column should be not nullable
            const isNullableInitial = await checkColumnNullable('test_nullable_migration', 'not_nullable_col', knex);
            assert.equal(isNullableInitial, false, 'Column should initially be not nullable');

            const runDownMigration = await runUpMigration(knex, migration);

            // Verify column is now nullable
            const isNullableAfter = await checkColumnNullable('test_nullable_migration', 'not_nullable_col', knex);
            assert.equal(isNullableAfter, true, 'Column should be nullable after up migration');

            // Test down migration
            await runDownMigration();
            const isNullableAfterDown = await checkColumnNullable('test_nullable_migration', 'not_nullable_col', knex);
            assert.equal(isNullableAfterDown, false, 'Column should be not nullable after down migration');

            await knex.destroy();
        });

        it('Skips setting nullable when column is already nullable', async function () {
            const knex = await setupNullableTestDb();

            const migration = utils.createSetNullableMigration('test_nullable_migration', 'nullable_col');

            // Verify initial state - column should already be nullable
            const isNullableInitial = await checkColumnNullable('test_nullable_migration', 'nullable_col', knex);
            assert.equal(isNullableInitial, true, 'Column should initially be nullable');

            // Spy on logging to verify skip message
            const logSpy = sinon.spy(logging, 'warn');

            try {
                const runDownMigration = await runUpMigration(knex, migration);

                sinon.assert.calledWith(logSpy, sinon.match('skipping as column is already nullable'));

                // Column should still be nullable
                const isNullableAfter = await checkColumnNullable('test_nullable_migration', 'nullable_col', knex);
                assert.equal(isNullableAfter, true, 'Column should still be nullable');

                await runDownMigration();
            } finally {
                logSpy.restore();

                await knex.destroy();
            }
        });
    });

    describe('createDropNullableMigration', function () {
        it('Drops nullable from a nullable column', async function () {
            const knex = await setupNullableTestDb();

            const migration = utils.createDropNullableMigration('test_nullable_migration', 'nullable_col');

            assert(migration.config.transaction, 'createDropNullableMigration creates a transactional migration');

            // Verify initial state - column should be nullable
            const isNullableInitial = await checkColumnNullable('test_nullable_migration', 'nullable_col', knex);
            assert.equal(isNullableInitial, true, 'Column should initially be nullable');

            const runDownMigration = await runUpMigration(knex, migration);

            // Verify column is now not nullable
            const isNotNullableAfter = await checkColumnNullable('test_nullable_migration', 'nullable_col', knex);
            assert.equal(isNotNullableAfter, false, 'Column should be not nullable after up migration');

            // Test down migration (should set back to nullable)
            await runDownMigration();
            const isNullableAfterDown = await checkColumnNullable('test_nullable_migration', 'nullable_col', knex);
            assert.equal(isNullableAfterDown, true, 'Column should be nullable after down migration');

            await knex.destroy();
        });

        it('Skips dropping nullable when column is already not nullable', async function () {
            const knex = await setupNullableTestDb();

            const migration = utils.createDropNullableMigration('test_nullable_migration', 'not_nullable_col');

            // Verify initial state - column should already be not nullable
            const isNotNullableInitial = await checkColumnNullable('test_nullable_migration', 'not_nullable_col', knex);
            assert.equal(isNotNullableInitial, false, 'Column should initially be not nullable');

            // Spy on logging to verify skip message
            const logSpy = sinon.spy(require('@tryghost/logging'), 'warn');

            try {
                const runDownMigration = await runUpMigration(knex, migration);

                sinon.assert.calledWith(logSpy, sinon.match('skipping as column is already not nullable'));

                // Column should still be not nullable
                const isNotNullableAfter = await checkColumnNullable('test_nullable_migration', 'not_nullable_col', knex);
                assert.equal(isNotNullableAfter, false, 'Column should still be not nullable');

                await runDownMigration();
            } finally {
                logSpy.restore();

                await knex.destroy();
            }
        });
    });

    describe('helper functions', function () {
        it('Nullable status detection works correctly', async function () {
            const knex = await setupNullableTestDb();

            const nullableResult = await checkColumnNullable('test_nullable_migration', 'nullable_col', knex);
            const notNullableResult = await checkColumnNullable('test_nullable_migration', 'not_nullable_col', knex);

            assert.equal(nullableResult, true, 'Should identify nullable column correctly');
            assert.equal(notNullableResult, false, 'Should identify not nullable column correctly');

            await knex.destroy();
        });
    });
});
