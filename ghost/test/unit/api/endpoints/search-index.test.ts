import assert from 'node:assert/strict';
import sinon from 'sinon';

// @ts-expect-error This module lacks type definitions.
import models from '../../../../core/server/models';
// @ts-expect-error This module lacks type definitions.
import urlService from '../../../../core/server/services/url';
// @ts-expect-error This module lacks type definitions.
import { PostsService } from '../../../../core/server/services/posts/posts-service-instance';
// @ts-expect-error This module lacks type definitions.
import searchIndexController from '../../../../core/server/api/endpoints/search-index';

describe('Search index controller', function () {
  let browsePostsStub: sinon.SinonStub;

  beforeEach(function () {
    // the controller constructs its own PostsService instance
    browsePostsStub = sinon.stub(PostsService.prototype, 'browsePosts').resolves({ data: [] });
    sinon.stub(models.Tag, 'findPage').resolves({ data: [] });
    sinon.stub(models.User, 'findPage').resolves({ data: [] });
  });

  afterEach(function () {
    sinon.restore();
  });

  it('forces the URL service required columns into the tags fetch', async function () {
    sinon
      .stub(Object.getPrototypeOf(urlService), 'getRequiredFields')
      .withArgs('tags')
      .returns(['visibility', 'slug']);
    sinon.stub(Object.getPrototypeOf(urlService), 'getRequiredRelations').returns([]);

    await searchIndexController.fetchTags.query();

    const options = models.Tag.findPage.getCall(0).args[0];
    assert.deepEqual(options.columns, ['id', 'slug', 'name', 'url', 'visibility']);
  });

  it('forces router-filter columns into the posts fetch', async function () {
    const getRequiredFields = sinon.stub(Object.getPrototypeOf(urlService), 'getRequiredFields');
    getRequiredFields.withArgs('posts').returns(['status', 'type', 'slug', 'featured']);
    sinon.stub(Object.getPrototypeOf(urlService), 'getRequiredRelations').returns([]);

    await searchIndexController.fetchPosts.query();

    const options = browsePostsStub.getCall(0).args[0];
    assert.ok(options.columns.includes('featured'));
    assert.ok(options.columns.includes('type'));
  });

  it('leaves columns untouched when the routing config needs none', async function () {
    sinon.stub(Object.getPrototypeOf(urlService), 'getRequiredFields').returns([]);
    sinon.stub(Object.getPrototypeOf(urlService), 'getRequiredRelations').returns([]);

    await searchIndexController.fetchTags.query();

    const options = models.Tag.findPage.getCall(0).args[0];
    assert.deepEqual(options.columns, ['id', 'slug', 'name', 'url']);
  });
});
