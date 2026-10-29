const assert = require('node:assert/strict');
const sinon = require('sinon');
const testUtils = require('../../utils');
const Models = require('../../../core/server/models');

const KnexMigrator = require('knex-migrator');
const path = require('path');
const semver = require('semver');

const knexMigrator = new KnexMigrator({
  knexMigratorFilePath: path.join(__dirname, '../../../'),
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
      await knexMigrator.reset({ force: true });
      await knexMigrator.init();
    });

    it('can rollback to the previous minor version', async function () {
      await knexMigrator.rollback({
        version: previousVersion,
        force: true,
      });
    });

    it('can rollback to the previous minor version and then forwards again', async function () {
      await knexMigrator.rollback({
        version: previousVersion,
        force: true,
      });
      await knexMigrator.migrate({
        force: true,
      });
    });

    it('should have idempotent migrations', async function () {
      // Delete all knowledge that we've run migrations so we can run them again
      await db.knex('migrations').whereILike('version', `${currentMajor}.%`).del();

      await knexMigrator.migrate({
        force: true,
      });
    });
  });

  describe('Fixtures', function () {
    describe('Populate', function () {
      beforeEach(testUtils.setup('default'));

      it('should populate all fixtures correctly', async function () {
        const [posts, tags, users, roles] = await Promise.all([
          Models.Post.findAll({ withRelated: ['tags'] }),
          Models.Tag.findAll(),
          Models.User.findAll({
            filter: 'status:inactive',
            context: { internal: true },
            withRelated: ['roles'],
          }),
          Models.Role.findAll(),
        ]);
        // Post
        assert(posts);
        assert.equal(posts.length, 7);
        assert.equal(
          posts.at(0).get('title'),
          'Start here for a quick overview of everything you need to know',
        );
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
        assert.equal(roles.length, 10);
        assert.equal(roles.at(0).get('name'), 'Administrator');
        assert.equal(roles.at(1).get('name'), 'Editor');
        assert.equal(roles.at(2).get('name'), 'Author');
        assert.equal(roles.at(3).get('name'), 'Contributor');
        assert.equal(roles.at(4).get('name'), 'Owner');
        assert.equal(roles.at(5).get('name'), 'Admin Integration');
        assert.equal(roles.at(6).get('name'), 'Self-Serve Migration Integration');
        assert.equal(roles.at(7).get('name'), 'DB Backup Integration');
        assert.equal(roles.at(8).get('name'), 'Scheduler Integration');
        assert.equal(roles.at(9).get('name'), 'Super Editor');
      });
    });
  });
});
