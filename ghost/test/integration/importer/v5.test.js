const assert = require('node:assert/strict');
const dataImporter = require('../../../core/server/data/importer/importers/data');
const models = require('../../../core/server/models');
const testUtils = require('../../utils');
const { exportedBodyV5 } = require('../../utils/fixtures/export/body-generator');

const importOptions = {
  returnImportedData: true,
};

const LEGACY_HARDCODED_USER_ID = '1';

describe('Importing 5.x export', function () {
  beforeEach(async function () {
    await testUtils.teardownDb();
    await testUtils.setup('roles', 'owner')();
  });

  it('imports 5.x data', async function () {
    const exportData = exportedBodyV5().db[0];

    exportData.data.users[0] = testUtils.DataGenerator.forKnex.createUser({
      id: LEGACY_HARDCODED_USER_ID,
      email: 'import-test-user@ghost.org',
      slug: 'import-test-user',
    });

    exportData.data.roles = [testUtils.DataGenerator.forKnex.createRole({ name: 'Owner' })];

    exportData.data.roles_users = [
      testUtils.DataGenerator.forKnex.createUsersRoles(
        exportData.data.users[0].id,
        exportData.data.roles[0].id,
      ),
    ];

    exportData.data.posts[0] = testUtils.DataGenerator.forKnex.createPost({
      slug: 'post1',
      title: 'title1',
      authors: [
        {
          id: exportData.data.users[0].id,
        },
      ],
      published_by: exportData.data.users[0].id,
    });

    exportData.data.posts[1] = testUtils.DataGenerator.forKnex.createPost({
      slug: 'post2',
      title: 'title2',
      authors: [
        {
          id: exportData.data.users[0].id,
        },
      ],
      published_by: exportData.data.users[0].id,
    });

    const postOptions = Object.assign({ withRelated: ['authors'] }, testUtils.context.internal);
    const userOptions = Object.assign({ withRelated: ['roles'] }, testUtils.context.internal);

    await dataImporter.doImport(exportData, importOptions);

    const users = await models.User.findPage(userOptions);
    const posts = await models.Post.findPage(postOptions);

    assert.equal(users.data.length, 2);

    const user1 = users.data[0].toJSON();
    const user2 = users.data[1].toJSON();

    // Current owner user
    assert.equal(user1.email, 'jbloggs@example.com');

    // Imported user
    assert.equal(user2.email, 'import-test-user@ghost.org');
    assert.notEqual(user2.id, LEGACY_HARDCODED_USER_ID);

    assert.equal(posts.data.length, 2);

    const post1 = posts.data[0].toJSON();
    const post2 = posts.data[1].toJSON();

    assert.equal(post1.authors[0].id, user2.id);
    assert.equal(post2.authors[0].id, user2.id);
  });
  it('imports a trial publication with more than ten authors, preserving posts and attribution', async function () {
    const config = require('../../../core/shared/config');
    const limitsService = require('../../../core/server/services/limits');
    const originalPolicy = config.get('hostSettings:limits');
    config.set('hostSettings:limits', {
      limitTrialStaff: {
        max: 10,
        error:
          'Your trial supports up to {{max}} staff, including pending invitations and Contributors.',
      },
      limitTrialStaffInvites: {
        max: 15,
        error: 'Your trial allows {{max}} staff invitation emails in total, including resends.',
      },
    });
    limitsService.init();
    try {
      const exportData = exportedBodyV5().db[0];
      const role = testUtils.DataGenerator.forKnex.createRole({ name: 'Contributor' });
      exportData.data.roles = [role];
      exportData.data.users = Array.from({ length: 12 }, (_, i) =>
        testUtils.DataGenerator.forKnex.createUser({
          email: `import-author-${i}@example.com`,
          slug: `import-author-${i}`,
        }),
      );
      exportData.data.roles_users = exportData.data.users.map((author) =>
        testUtils.DataGenerator.forKnex.createUsersRoles(author.id, role.id),
      );
      exportData.data.posts = exportData.data.users.map((author, i) =>
        testUtils.DataGenerator.forKnex.createPost({
          slug: `import-post-${i}`,
          title: `Imported post ${i}`,
          authors: [{ id: author.id }],
          published_by: author.id,
        }),
      );
      await dataImporter.doImport(exportData, importOptions);
      const users = await models.User.findAll({
        ...testUtils.context.internal,
        withRelated: ['roles'],
      });
      assert.equal(users.length, 13);
      const posts = await models.Post.findAll({
        ...testUtils.context.internal,
        withRelated: ['authors'],
      });
      assert.equal(posts.length, 12);
      for (let i = 0; i < 12; i++) {
        const post = posts.find((entry) => entry.get('slug') === `import-post-${i}`);
        assert.equal(post.related('authors').at(0).get('email'), `import-author-${i}@example.com`);
      }
    } finally {
      config.set('hostSettings:limits', originalPolicy);
      limitsService.init();
    }
  });
});
