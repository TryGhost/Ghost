const assert = require('node:assert/strict');
const sinon = require('sinon');
const testUtils = require('../../utils');
const _ = require('lodash');
const Models = require('../../../core/server/models');

const KnexMigrator = require('knex-migrator');
const path = require('path');
const semver = require('semver');

const knexMigrator = new KnexMigrator({
    knexMigratorFilePath: path.join(__dirname, '../../../')
});

const db = require('../../../core/server/data/db');
const dbUtils = require('../../utils/db-utils');

const currentVersion = require('@tryghost/version');
const currentMajor = semver.major(currentVersion.original);
const previousMinor = semver.minor(currentVersion.original) - 1;
const previousVersion = `${currentMajor}.${previousMinor}`;

describe('Migrations', function () {
    beforeEach(async function () {
        await dbUtils.teardown();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Database initialization + rollback', function () {
        beforeEach(async function () {
            await knexMigrator.reset({force: true});
            await knexMigrator.init();
        });

        it('can rollback to the previous minor version', async function () {
            await knexMigrator.rollback({
                version: previousVersion,
                force: true
            });
        });

        it('can rollback to the previous minor version and then forwards again', async function () {
            await knexMigrator.rollback({
                version: previousVersion,
                force: true
            });
            await knexMigrator.migrate({
                force: true
            });
        });

        it('should have idempotent migrations', async function () {
            // Delete all knowledge that we've run migrations so we can run them again
            if (dbUtils.isMySQL()) {
                await db.knex('migrations').whereILike('version', `${currentMajor}.%`).del();
            } else {
                await db.knex('migrations').whereLike('version', `${currentMajor}.%`).del();
            }

            await knexMigrator.migrate({
                force: true
            });
        });
    });

    describe('Fixtures', function () {
        // Custom assertion for detection that a permissions is assigned to the correct roles
        function assertAssignedToRoles(permission, roles) {
            assert('roles' in permission);
            assert(Array.isArray(permission.roles));

            // Ensure the roles are in id order
            const roleNames = _(permission.roles).sortBy('id').map('name').value();
            assert.deepEqual(roleNames, roles);
        }

        function assertHavePermission(permissions, name, roles = null) {
            const permission = permissions.find((p) => {
                return p.name === name;
            });
            assert(permission, `Could not find permission ${name}`);

            if (roles) {
                assertAssignedToRoles(permission, roles);
            }
        }

        // Custom assertion to wrap all permissions
        function assertCompletePermissions(permissions) {
            // If you have to change this number, please add the relevant `assertHavePermission` checks below
            assert.equal(permissions.length, 125);

            assertHavePermission(permissions, 'Export database', ['Administrator', 'DB Backup Integration']);
            assertHavePermission(permissions, 'Import database', ['Administrator', 'Self-Serve Migration Integration', 'DB Backup Integration']);
            assertHavePermission(permissions, 'Delete all content', ['Administrator', 'DB Backup Integration']);
            assertHavePermission(permissions, 'Backup database', ['Administrator', 'DB Backup Integration']);

            assertHavePermission(permissions, 'Send mail', ['Administrator', 'Admin Integration']);

            assertHavePermission(permissions, 'Browse notifications', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Add notifications', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Delete notifications', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);

            assertHavePermission(permissions, 'Browse posts', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Read posts', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Edit posts', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Add posts', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Delete posts', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Publish posts', ['Administrator', 'Editor', 'Admin Integration', 'Scheduler Integration', 'Super Editor']);

            assertHavePermission(permissions, 'Browse settings', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Read settings', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Edit settings', ['Administrator', 'Admin Integration']);

            assertHavePermission(permissions, 'Generate slugs', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);

            assertHavePermission(permissions, 'Browse tags', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Read tags', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Self-Serve Migration Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Edit tags', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Add tags', ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Delete tags', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);

            assertHavePermission(permissions, 'Browse themes', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Edit themes', ['Administrator', 'Admin Integration']);
            assertHavePermission(permissions, 'Activate themes', ['Administrator', 'Admin Integration']);
            assertHavePermission(permissions, 'View active theme details', ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Upload themes', ['Administrator', 'Admin Integration']);
            assertHavePermission(permissions, 'Download themes', ['Administrator', 'Admin Integration']);
            assertHavePermission(permissions, 'Delete themes', ['Administrator', 'Admin Integration']);

            assertHavePermission(permissions, 'Browse users', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Read users', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Edit users', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Add users', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Delete users', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);

            assertHavePermission(permissions, 'Assign a role', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Browse roles', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Browse invites', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Read invites', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Edit invites', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Add invites', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Delete invites', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);

            assertHavePermission(permissions, 'Download redirects', ['Administrator', 'Admin Integration']);
            assertHavePermission(permissions, 'Upload redirects', ['Administrator', 'Admin Integration']);

            assertHavePermission(permissions, 'Add webhooks', ['Administrator', 'Admin Integration']);
            assertHavePermission(permissions, 'Edit webhooks', ['Administrator', 'Admin Integration']);
            assertHavePermission(permissions, 'Delete webhooks', ['Administrator', 'Admin Integration']);

            assertHavePermission(permissions, 'Browse integrations', ['Administrator']);
            assertHavePermission(permissions, 'Read integrations', ['Administrator']);
            assertHavePermission(permissions, 'Edit integrations', ['Administrator']);
            assertHavePermission(permissions, 'Add integrations', ['Administrator']);
            assertHavePermission(permissions, 'Delete integrations', ['Administrator']);

            assertHavePermission(permissions, 'Browse API keys', ['Administrator']);
            assertHavePermission(permissions, 'Read API keys', ['Administrator']);
            assertHavePermission(permissions, 'Edit API keys', ['Administrator']);
            assertHavePermission(permissions, 'Add API keys', ['Administrator']);
            assertHavePermission(permissions, 'Delete API keys', ['Administrator']);

            assertHavePermission(permissions, 'Browse Actions', ['Administrator', 'Admin Integration']);

            assertHavePermission(permissions, 'Email preview', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Send test email', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Browse emails', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Read emails', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Retry emails', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);

            assertHavePermission(permissions, 'Browse snippets', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Read snippets', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Edit snippets', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Add snippets', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Delete snippets', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);

            assertHavePermission(permissions, 'Browse labels', ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Read labels', ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Edit labels', ['Administrator', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Add labels', ['Administrator', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Delete labels', ['Administrator', 'Admin Integration', 'Super Editor']);

            assertHavePermission(permissions, 'Read member signin urls');
            assertHavePermission(permissions, 'Read identities');
            assertHavePermission(permissions, 'Auth Stripe Connect for Members');

            assertHavePermission(permissions, 'Browse Members');
            assertHavePermission(permissions, 'Read Members');
            assertHavePermission(permissions, 'Edit Members');
            assertHavePermission(permissions, 'Add Members', ['Administrator', 'Admin Integration', 'Self-Serve Migration Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Delete Members');

            assertHavePermission(permissions, 'Browse offers');
            assertHavePermission(permissions, 'Read offers');
            assertHavePermission(permissions, 'Edit offers');
            assertHavePermission(permissions, 'Add offers');

            assertHavePermission(permissions, 'Browse Products', ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Read Products', ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Edit Products', ['Administrator', 'Admin Integration']);
            assertHavePermission(permissions, 'Add Products', ['Administrator', 'Admin Integration']);
            assertHavePermission(permissions, 'Delete Products', ['Administrator']);

            assertHavePermission(permissions, 'Reset all passwords', ['Administrator']);

            assertHavePermission(permissions, 'Browse custom theme settings', ['Administrator']);
            assertHavePermission(permissions, 'Edit custom theme settings', ['Administrator']);

            assertHavePermission(permissions, 'Browse newsletters', ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Read newsletters', ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Edit newsletters', ['Administrator', 'Admin Integration']);
            assertHavePermission(permissions, 'Add newsletters', ['Administrator', 'Admin Integration']);

            assertHavePermission(permissions, 'Read explore data', ['Administrator', 'Admin Integration', 'Ghost Explore Integration']);

            assertHavePermission(permissions, 'Browse comments', ['Administrator', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Read comments', ['Administrator', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Edit comments', ['Administrator', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Add comments', ['Administrator', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Delete comments', ['Administrator', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Moderate comments', ['Administrator', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Like comments', ['Administrator', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Unlike comments', ['Administrator', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Report comments', ['Administrator', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Browse links', ['Administrator', 'Admin Integration']);
            assertHavePermission(permissions, 'Browse mentions', ['Administrator', 'Admin Integration']);

            assertHavePermission(permissions, 'Browse collections', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Read collections', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Edit collections', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Add collections', ['Administrator', 'Editor', 'Author', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Delete collections', ['Administrator', 'Editor', 'Admin Integration', 'Super Editor']);
            assertHavePermission(permissions, 'Read member signin urls', ['Administrator', 'Admin Integration', 'Super Editor']);

            assertHavePermission(permissions, 'Browse automated emails', ['Administrator', 'Admin Integration']);
            assertHavePermission(permissions, 'Read automated emails', ['Administrator', 'Admin Integration']);
            assertHavePermission(permissions, 'Edit automated emails', ['Administrator', 'Admin Integration']);
            assertHavePermission(permissions, 'Add automated emails', ['Administrator', 'Admin Integration']);
            assertHavePermission(permissions, 'Delete automated emails', ['Administrator', 'Admin Integration']);
        }

        describe('Populate', function () {
            beforeEach(testUtils.setup('default'));

            it('should populate all fixtures correctly', async function () {
                const [posts, tags, users, roles, permissions] = await Promise.all([
                    Models.Post.findAll({withRelated: ['tags']}),
                    Models.Tag.findAll(),
                    Models.User.findAll({
                        filter: 'status:inactive',
                        context: {internal: true},
                        withRelated: ['roles']
                    }),
                    Models.Role.findAll(),
                    Models.Permission.findAll({withRelated: ['roles']})
                ]);
                // Post
                assert(posts);
                assert.equal(posts.length, 7);
                assert.equal(posts.at(0).get('title'), 'Start here for a quick overview of everything you need to know');
                assert.equal(posts.at(6).get('title'), 'Setting up apps and custom integrations');

                // Tag
                assert(tags);
                assert.equal(tags.length, 1);
                assert.equal(tags.at(0).get('name'), 'Getting Started');

                // Post Tag relation
                assert.equal(posts.at(0).related('tags').length, 1);
                assert.equal(posts.at(0).related('tags').at(0).get('name'), 'Getting Started');

                // User (Owner)
                assert(users);
                assert.equal(users.length, 1);
                assert.equal(users.at(0).get('name'), 'Ghost');
                assert.equal(users.at(0).get('status'), 'inactive');
                assert.equal(users.at(0).related('roles').length, 1);
                assert.equal(users.at(0).related('roles').at(0).get('name'), 'Owner');

                // Roles
                assert(roles);
                assert.equal(roles.length, 11);
                assert.equal(roles.at(0).get('name'), 'Administrator');
                assert.equal(roles.at(1).get('name'), 'Editor');
                assert.equal(roles.at(2).get('name'), 'Author');
                assert.equal(roles.at(3).get('name'), 'Contributor');
                assert.equal(roles.at(4).get('name'), 'Owner');
                assert.equal(roles.at(5).get('name'), 'Admin Integration');
                assert.equal(roles.at(6).get('name'), 'Ghost Explore Integration');
                assert.equal(roles.at(7).get('name'), 'Self-Serve Migration Integration');
                assert.equal(roles.at(8).get('name'), 'DB Backup Integration');
                assert.equal(roles.at(9).get('name'), 'Scheduler Integration');
                assert.equal(roles.at(10).get('name'), 'Super Editor');

                // Permissions
                assertCompletePermissions(permissions.toJSON());
            });
        });
    });
});