const should = require('should');
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
        should.Assertion.add('AssignedToRoles', function (roles) {
            let roleNames;
            this.params = {operator: 'to have role'};

            should.exist(this.obj);

            this.obj.should.be.an.Object().with.property(['roles']);
            this.obj.roles.should.be.an.Array();

            // Ensure the roles are in id order
            roleNames = _(this.obj.roles).sortBy('id').map('name').value();
            roleNames.should.eql(roles);
        });

        should.Assertion.add('havePermission', function (name, roles = null) {
            const permission = this.obj.find((p) => {
                return p.name === name;
            });
            should.exist(permission, `Could not find permission ${name}`);

            if (roles) {
                permission.should.be.AssignedToRoles(roles);
            }
        });

        // Custom assertion to wrap all permissions
        should.Assertion.add('CompletePermissions', function () {
            this.params = {operator: 'to have a complete set of permissions'};
            const permissions = this.obj;

            // If you have to change this number, please add the relevant `havePermission` checks below
            permissions.length.should.eql(120);

            permissions.should.havePermission('Export database', ['Administrator', 'DB Backup Integration']);
            permissions.should.havePermission('Import database', ['Administrator', 'Self-Serve Migration Integration', 'DB Backup Integration']);
            permissions.should.havePermission('Delete all content', ['Administrator', 'DB Backup Integration']);
            permissions.should.havePermission('Backup database', ['Administrator', 'DB Backup Integration']);

            permissions.should.havePermission('Send mail', ['Administrator', 'Admin Integration']);

            permissions.should.havePermission('Browse notifications', ['Administrator', 'Editor', 'Admin Integration']);
            permissions.should.havePermission('Add notifications', ['Administrator', 'Editor', 'Admin Integration']);
            permissions.should.havePermission('Delete notifications', ['Administrator', 'Editor', 'Admin Integration']);

            permissions.should.havePermission('Browse posts', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Read posts', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Edit posts', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Add posts', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Delete posts', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Publish posts', ['Administrator', 'Editor', 'Admin Integration', 'Scheduler Integration']);

            permissions.should.havePermission('Browse settings', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Read settings', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Edit settings', ['Administrator', 'Admin Integration']);

            permissions.should.havePermission('Generate slugs', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);

            permissions.should.havePermission('Browse tags', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Read tags', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration', 'Self-Serve Migration Integration']);
            permissions.should.havePermission('Edit tags', ['Administrator', 'Editor', 'Admin Integration']);
            permissions.should.havePermission('Add tags', ['Administrator', 'Editor', 'Author', 'Admin Integration']);
            permissions.should.havePermission('Delete tags', ['Administrator', 'Editor', 'Admin Integration']);

            permissions.should.havePermission('Browse themes', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Edit themes', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Activate themes', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('View active theme details', ['Administrator', 'Editor', 'Author', 'Admin Integration']);
            permissions.should.havePermission('Upload themes', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Download themes', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Delete themes', ['Administrator', 'Admin Integration']);

            permissions.should.havePermission('Browse users', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Read users', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Edit users', ['Administrator', 'Editor', 'Admin Integration']);
            permissions.should.havePermission('Add users', ['Administrator', 'Editor', 'Admin Integration']);
            permissions.should.havePermission('Delete users', ['Administrator', 'Editor', 'Admin Integration']);

            permissions.should.havePermission('Assign a role', ['Administrator', 'Editor', 'Admin Integration']);
            permissions.should.havePermission('Browse roles', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Browse invites', ['Administrator', 'Editor', 'Admin Integration']);
            permissions.should.havePermission('Read invites', ['Administrator', 'Editor', 'Admin Integration']);
            permissions.should.havePermission('Edit invites', ['Administrator', 'Editor', 'Admin Integration']);
            permissions.should.havePermission('Add invites', ['Administrator', 'Editor', 'Admin Integration']);
            permissions.should.havePermission('Delete invites', ['Administrator', 'Editor', 'Admin Integration']);

            permissions.should.havePermission('Download redirects', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Upload redirects', ['Administrator', 'Admin Integration']);

            permissions.should.havePermission('Add webhooks', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Edit webhooks', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Delete webhooks', ['Administrator', 'Admin Integration']);

            permissions.should.havePermission('Browse integrations', ['Administrator']);
            permissions.should.havePermission('Read integrations', ['Administrator']);
            permissions.should.havePermission('Edit integrations', ['Administrator']);
            permissions.should.havePermission('Add integrations', ['Administrator']);
            permissions.should.havePermission('Delete integrations', ['Administrator']);

            permissions.should.havePermission('Browse API keys', ['Administrator']);
            permissions.should.havePermission('Read API keys', ['Administrator']);
            permissions.should.havePermission('Edit API keys', ['Administrator']);
            permissions.should.havePermission('Add API keys', ['Administrator']);
            permissions.should.havePermission('Delete API keys', ['Administrator']);

            permissions.should.havePermission('Browse Actions', ['Administrator', 'Admin Integration']);

            permissions.should.havePermission('Email preview', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Send test email', ['Administrator', 'Editor', 'Admin Integration']);
            permissions.should.havePermission('Browse emails', ['Administrator', 'Editor', 'Admin Integration']);
            permissions.should.havePermission('Read emails', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Retry emails', ['Administrator', 'Editor', 'Admin Integration']);

            permissions.should.havePermission('Browse snippets', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Read snippets', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Edit snippets', ['Administrator', 'Editor', 'Admin Integration']);
            permissions.should.havePermission('Add snippets', ['Administrator', 'Editor', 'Admin Integration']);
            permissions.should.havePermission('Delete snippets', ['Administrator', 'Editor', 'Admin Integration']);

            permissions.should.havePermission('Browse labels', ['Administrator', 'Editor', 'Author', 'Admin Integration']);
            permissions.should.havePermission('Read labels', ['Administrator', 'Editor', 'Author', 'Admin Integration']);
            permissions.should.havePermission('Edit labels', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Add labels', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Delete labels', ['Administrator', 'Admin Integration']);

            permissions.should.havePermission('Read member signin urls');
            permissions.should.havePermission('Read identities');
            permissions.should.havePermission('Auth Stripe Connect for Members');

            permissions.should.havePermission('Browse Members');
            permissions.should.havePermission('Read Members');
            permissions.should.havePermission('Edit Members');
            permissions.should.havePermission('Add Members', ['Administrator', 'Admin Integration', 'Self-Serve Migration Integration']);
            permissions.should.havePermission('Delete Members');

            permissions.should.havePermission('Browse offers');
            permissions.should.havePermission('Read offers');
            permissions.should.havePermission('Edit offers');
            permissions.should.havePermission('Add offers');

            permissions.should.havePermission('Browse Products', ['Administrator', 'Editor', 'Author', 'Admin Integration']);
            permissions.should.havePermission('Read Products', ['Administrator', 'Editor', 'Author', 'Admin Integration']);
            permissions.should.havePermission('Edit Products', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Add Products', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Delete Products', ['Administrator']);

            permissions.should.havePermission('Reset all passwords', ['Administrator']);

            permissions.should.havePermission('Browse custom theme settings', ['Administrator']);
            permissions.should.havePermission('Edit custom theme settings', ['Administrator']);

            permissions.should.havePermission('Browse newsletters', ['Administrator', 'Editor', 'Author', 'Admin Integration']);
            permissions.should.havePermission('Read newsletters', ['Administrator', 'Editor', 'Author', 'Admin Integration']);
            permissions.should.havePermission('Edit newsletters', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Add newsletters', ['Administrator', 'Admin Integration']);

            permissions.should.havePermission('Read explore data', ['Administrator', 'Admin Integration', 'Ghost Explore Integration']);

            permissions.should.havePermission('Browse comments', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Read comments', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Edit comments', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Add comments', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Delete comments', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Moderate comments', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Like comments', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Unlike comments', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Report comments', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Browse links', ['Administrator', 'Admin Integration']);
            permissions.should.havePermission('Browse mentions', ['Administrator', 'Admin Integration']);

            permissions.should.havePermission('Browse collections', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Read collections', ['Administrator', 'Editor', 'Author', 'Contributor', 'Admin Integration']);
            permissions.should.havePermission('Edit collections', ['Administrator', 'Editor', 'Admin Integration']);
            permissions.should.havePermission('Add collections', ['Administrator', 'Editor', 'Author', 'Admin Integration']);
            permissions.should.havePermission('Delete collections', ['Administrator', 'Editor', 'Admin Integration']);
            permissions.should.havePermission('Read member signin urls', ['Administrator', 'Admin Integration']);
        });

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
                should.exist(posts);
                posts.length.should.eql(7);
                posts.at(0).get('title').should.eql('Start here for a quick overview of everything you need to know');
                posts.at(6).get('title').should.eql('Setting up apps and custom integrations');

                // Tag
                should.exist(tags);
                tags.length.should.eql(1);
                tags.at(0).get('name').should.eql('Getting Started');

                // Post Tag relation
                posts.at(0).related('tags').length.should.eql(1);
                posts.at(0).related('tags').at(0).get('name').should.eql('Getting Started');

                // User (Owner)
                should.exist(users);
                users.length.should.eql(1);
                users.at(0).get('name').should.eql('Ghost');
                users.at(0).get('status').should.eql('inactive');
                users.at(0).related('roles').length.should.eql(1);
                users.at(0).related('roles').at(0).get('name').should.eql('Owner');

                // Roles
                should.exist(roles);
                roles.length.should.eql(10);
                roles.at(0).get('name').should.eql('Administrator');
                roles.at(1).get('name').should.eql('Editor');
                roles.at(2).get('name').should.eql('Author');
                roles.at(3).get('name').should.eql('Contributor');
                roles.at(4).get('name').should.eql('Owner');
                roles.at(5).get('name').should.eql('Admin Integration');
                roles.at(6).get('name').should.eql('Ghost Explore Integration');
                roles.at(7).get('name').should.eql('Self-Serve Migration Integration');
                roles.at(8).get('name').should.eql('DB Backup Integration');
                roles.at(9).get('name').should.eql('Scheduler Integration');

                // Permissions
                permissions.toJSON().should.be.CompletePermissions();
            });
        });
    });
});
