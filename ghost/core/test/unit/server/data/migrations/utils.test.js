const should = require('should');
const sinon = require('sinon');
const errors = require('@tryghost/errors');

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

            should.ok(migration.config.transaction, 'Migration config should set transaction to true');

            should.ok(upResult instanceof Promise, 'Migration up method should return a Promise');
            should.ok(downResult instanceof Promise, 'Migration down method should return a Promise');

            should.ok(up.calledOnceWith(config.transacting), 'up function should be called with transacting');
            should.ok(down.calledOnceWith(config.transacting), 'down function should be called with transacting');
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

            should.ok(combinedMigration.config.transaction, 'Migration config should set transaction to true');

            const upResult = combinedMigration.up(config);
            should.ok(upResult instanceof Promise, 'Migration up method should return a Promise');

            await upResult;
            should.ok(upA.calledOnceWith(config.transacting), 'first up fn should be called with transacting');
            should.ok(upB.calledOnceWith(config.transacting), 'second up fn should be called with transacting');
            should.ok(upA.calledBefore(upB), 'Migration up method should call child up methods in order');

            const downResult = combinedMigration.down(config);
            should.ok(downResult instanceof Promise, 'Migration down method should return a Promise');

            await downResult;
            should.ok(downA.calledOnceWith(config.transacting), 'first down fn should be called with transacting');
            should.ok(downB.calledOnceWith(config.transacting), 'second down fn should be called with transacting');
            should.ok(downB.calledBefore(downA), 'Migration down method should call child down methods in reverse order');
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

            should.ok(!upB.called, 'second up fn should not be called until first up fn has resolved');
            await upDeferredA.resolve();
            should.ok(upB.calledOnce, 'second up fn should be called once first up fn has resolved');

            combinedMigration.down(config);

            should.ok(!downA.called, 'penultimate down fn should not be called until last down fn has resolved');
            await downDeferredB.resolve();
            should.ok(downA.calledOnce, 'penultimate down fn should be called once last down fn has resolved');
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

            should.ok(!upB.called, 'second up fn should not be called until first up fn has resolved');
            try {
                await upDeferredA.reject(new Error('some reason'));
            } catch (err) {
                //
            } finally {
                should.ok(!upB.called, 'second up fn should not be called if first up fn has rejected');
            }

            let upError = null;
            try {
                await upResult;
            } catch (err) {
                upError = true;
            } finally {
                should.ok(upError, 'Migration up should error if child errors');
            }

            const downResult = combinedMigration.down(config);

            should.ok(!downA.called, 'penultimate down fn should not be called until last down fn has resolved');
            try {
                await downDeferredB.reject(new Error('some reason'));
            } catch (err) {
                //
            } finally {
                should.ok(!downA.called, 'penultimate down fn should not be called if last down fn has rejected');
            }

            let downErr = null;
            try {
                await downResult;
            } catch (err) {
                downErr = err;
            } finally {
                should.ok(downErr, 'Migration down should error if child errors');
            }
        });
    });
});

const Knex = require('knex');
const ObjectId = require('bson-objectid').default;

async function setupDb() {
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
            \`created_by\` varchar(24) not null,
            \`updated_at\` datetime null,
            \`updated_by\` varchar(24) null,
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
            \`created_by\` varchar(24) not null,
            \`updated_at\` datetime null,
            \`updated_by\` varchar(24) null,
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
        created_by: utils.meta.MIGRATION_USER,
        updated_at: date,
        updated_by: utils.meta.MIGRATION_USER
    });

    await knex('roles').insert({
        id: ObjectId().toHexString(),
        name: 'Other Role Name',
        description: 'Other Role description',
        created_at: date,
        created_by: utils.meta.MIGRATION_USER,
        updated_at: date,
        updated_by: utils.meta.MIGRATION_USER
    });

    await knex('permissions').insert({
        id: ObjectId().toHexString(),
        name: 'Permission Name',
        action_type: 'action',
        object_type: 'object',
        created_at: date,
        created_by: utils.meta.MIGRATION_USER,
        updated_at: date,
        updated_by: utils.meta.MIGRATION_USER
    });

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
            const knex = await setupDb();

            const migration = utils.addPermission({
                name: 'scarface',
                object: 'my little friend',
                action: 'say hello'
            });

            should.ok(migration.config.transaction, 'addPermission creates a transactional migration');

            const runDownMigration = await runUpMigration(knex, migration);

            const allPermissionsAfterUp = await knex('permissions').select();
            const insertedPermissionsAfterUp = allPermissionsAfterUp.filter((row) => {
                return row.name === 'scarface';
            });

            should.ok(insertedPermissionsAfterUp.length === 1, 'The permission was inserted into the database');

            await runDownMigration();

            const allPermissionsAfterDown = await knex('permissions').select();
            const insertedPermissionsAfterDown = allPermissionsAfterDown.filter((row) => {
                return row.name === 'scarface';
            });

            should.ok(insertedPermissionsAfterDown.length === 0, 'The permission was removed');
        });
    });

    describe('addPermissionToRole', function () {
        it('Accepts a permission name and role name and returns a migration which adds a permission to the database', async function () {
            const knex = await setupDb();

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

            should.ok(attachedPermissionAfterUp, 'The permission was attached to the role.');

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

            should.ok(!attachedPermissionAfterDown, 'The permission was removed from the role.');
        });

        describe('Throws errors', function () {
            it('Throws when permission cannot be found in up migration', async function () {
                const knex = await setupDb();

                const migration = utils.addPermissionToRole({
                    permission: 'Unimaginable',
                    role: 'Not there'
                });

                let runDownMigration;
                try {
                    runDownMigration = await runUpMigration(knex, migration);
                    should.fail('addPermissionToRole up migration did not throw');
                } catch (err) {
                    should.equal(errors.utils.isGhostError(err), true);
                    err.message.should.equal('Cannot add permission(Unimaginable) with role(Not there) - permission does not exist');
                }
            });

            it('Does not throw when permission cannot be found in down migration', async function () {
                const knex = await setupDb();

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
                const knex = await setupDb();

                const migration = utils.addPermissionToRole({
                    permission: 'Permission Name',
                    role: 'Not there'
                });

                try {
                    await runUpMigration(knex, migration);
                    should.fail('addPermissionToRole did not throw');
                } catch (err) {
                    should.equal(errors.utils.isGhostError(err), true);
                    err.message.should.equal('Cannot add permission(Permission Name) with role(Not there) - role does not exist');
                }
            });

            it('Does not throw when role cannot be found in down migration', async function () {
                const knex = await setupDb();

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
            const knex = await setupDb();

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

            should.ok(insertedPermissionsAfterUp.length === 1, 'The permission was inserted into the database');

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

            should.ok(permissionAttachedToRoleAfterUp, 'The permission was attached to the role.');

            const allPermissionsForOtherRoleAfterUp = await knex.raw(`
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

            should.ok(permissionAttachedToOtherRoleAfterUp, 'The permission was attached to the other role.');

            await runDownMigration();

            const allPermissionsAfterDown = await knex('permissions').select();
            const insertedPermissionsAfterDown = allPermissionsAfterDown.filter((row) => {
                return row.name === 'scarface';
            });

            should.ok(insertedPermissionsAfterDown.length === 0, 'The permission was removed from the database');

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

            should.ok(!permissionAttachedToRoleAfterDown, 'The permission was removed from the role.');

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

            should.ok(!permissionAttachedToOtherRoleAfterDown, 'The permission was removed from the other role.');
        });
    });
});
