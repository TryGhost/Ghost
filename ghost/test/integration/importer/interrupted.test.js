const assert = require('node:assert/strict');
const sinon = require('sinon');
const dataImporter = require('../../../core/server/data/importer/importers/data');
const models = require('../../../core/server/models');
const testUtils = require('../../utils');
const { exportedBodyV5 } = require('../../utils/fixtures/export/body-generator');

describe('Importing when Ghost starts shutting down', function () {
  beforeEach(async function () {
    await testUtils.teardownDb();
    await testUtils.setup('roles', 'owner')();
  });

  afterEach(function () {
    sinon.restore();
  });

  it('stops between posts and rolls back everything it imported', async function () {
    const exportData = exportedBodyV5().db[0];
    exportData.data.posts = ['first', 'second'].map((slug) =>
      testUtils.DataGenerator.forKnex.createPost({ slug, title: slug }),
    );
    const stop = new AbortController();
    const interrupted = new Error('stopping');
    const add = models.Post.add;
    sinon.stub(models.Post, 'add').callsFake(async function (...args) {
      const added = await add.apply(this, args);
      // Shutdown is requested once the first post is in
      stop.abort(interrupted);
      return added;
    });

    await assert.rejects(dataImporter.doImport(exportData, { signal: stop.signal }), interrupted);

    sinon.assert.calledOnce(models.Post.add);
    const posts = await models.Post.findAll({ filter: 'slug:[first,second]', status: 'all' });
    assert.equal(posts.length, 0);
  });
});
