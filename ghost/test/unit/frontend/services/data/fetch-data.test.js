const assert = require('node:assert/strict');
const { assertExists } = require('../../../../utils/assertions');
const sinon = require('sinon');
const _ = require('lodash');

const api = require('../../../../../core/frontend/services/proxy').api;
const data = require('../../../../../core/frontend/services/data');
const testUtils = require('../../../../utils');

describe('Unit - frontend/data/fetch-data', function () {
  let posts;
  let tags;
  let locals;
  let browsePostsStub;
  let readTagsStub;

  beforeEach(function () {
    posts = [
      testUtils.DataGenerator.forKnex.createPost({ url: '/a/' }),
      testUtils.DataGenerator.forKnex.createPost({ url: '/b/' }),
      testUtils.DataGenerator.forKnex.createPost({ url: '/c/' }),
      testUtils.DataGenerator.forKnex.createPost({ url: '/d/' }),
    ];

    tags = [
      testUtils.DataGenerator.forKnex.createTag(),
      testUtils.DataGenerator.forKnex.createTag(),
      testUtils.DataGenerator.forKnex.createTag(),
      testUtils.DataGenerator.forKnex.createTag(),
    ];

    browsePostsStub = sinon.stub().resolves({
      posts: posts,
      meta: {
        pagination: {
          pages: 2,
        },
      },
    });
    sinon.stub(api, 'postsPublic').get(() => {
      return {
        browse: browsePostsStub,
      };
    });

    readTagsStub = sinon.stub().resolves({ tags: tags });
    sinon.stub(api, 'tagsPublic').get(() => {
      return {
        read: readTagsStub,
      };
    });

    locals = {};
  });

  afterEach(function () {
    sinon.restore();
  });

  it('should handle no options', async function () {
    const result = await data.fetchData(null, null, locals);
    assertExists(result);
    assert(result && typeof result === 'object');
    assert('posts' in result);
    assert('meta' in result);
    assert(!('data' in result));

    sinon.assert.calledOnce(browsePostsStub);
    assert(_.isPlainObject(browsePostsStub.firstCall.args[0]));
    assert('include' in browsePostsStub.firstCall.args[0]);
    assert(!('filter' in browsePostsStub.firstCall.args[0]));
  });

  it('should handle page and limit options', async function () {
    const result = await data.fetchData({ page: 2, limit: 10 }, null, locals);
    assertExists(result);
    assert(result && typeof result === 'object');
    assert('posts' in result);
    assert('meta' in result);
    assert(!('data' in result));

    assert.equal(result.posts.length, posts.length);

    sinon.assert.calledOnce(browsePostsStub);
    assert(_.isPlainObject(browsePostsStub.firstCall.args[0]));
    assert('include' in browsePostsStub.firstCall.args[0]);
    assert.equal(browsePostsStub.firstCall.args[0].limit, 10);
    assert.equal(browsePostsStub.firstCall.args[0].page, 2);
  });

  it('should handle multiple queries', async function () {
    const pathOptions = {};

    const routerOptions = {
      data: {
        featured: {
          type: 'browse',
          resource: 'posts',
          filter: 'featured:true',
          limit: 3,
        },
      },
    };

    const result = await data.fetchData(pathOptions, routerOptions, locals);
    assertExists(result);
    assert(result && typeof result === 'object');
    assert('posts' in result);
    assert('meta' in result);
    assert('data' in result);
    assert(result.data && typeof result.data === 'object');
    assert('featured' in result.data);

    assert.equal(result.posts.length, posts.length);
    assert.equal(result.data.featured.length, posts.length);

    sinon.assert.calledTwice(browsePostsStub);
    assert.equal(browsePostsStub.firstCall.args[0].include, 'authors,tags,tiers');
    assert.equal(browsePostsStub.secondCall.args[0].filter, 'featured:true');
    assert.equal(browsePostsStub.secondCall.args[0].limit, 3);
  });

  it('should handle multiple queries with page param', async function () {
    const pathOptions = {
      page: 2,
    };

    const routerOptions = {
      data: {
        featured: { type: 'browse', resource: 'posts', filter: 'featured:true', limit: 3 },
      },
    };

    const result = await data.fetchData(pathOptions, routerOptions, locals);
    assertExists(result);

    assert(result && typeof result === 'object');
    assert('posts' in result);
    assert('meta' in result);
    assert('data' in result);
    assert(result.data && typeof result.data === 'object');
    assert('featured' in result.data);

    assert.equal(result.posts.length, posts.length);
    assert.equal(result.data.featured.length, posts.length);

    sinon.assert.calledTwice(browsePostsStub);
    assert.equal(browsePostsStub.firstCall.args[0].include, 'authors,tags,tiers');
    assert.equal(browsePostsStub.firstCall.args[0].page, 2);
    assert.equal(browsePostsStub.secondCall.args[0].filter, 'featured:true');
    assert.equal(browsePostsStub.secondCall.args[0].limit, 3);
  });

  it('should handle queries with slug replacements', async function () {
    const pathOptions = {
      slug: 'testing',
    };

    // The taxonomy router hands over a read entry with a `%s` placeholder
    // for the slug, which fetch-data fills in from the request path.
    const routerOptions = {
      filter: 'tags:%s',
      data: {
        tag: { type: 'read', resource: 'tags', slug: '%s' },
      },
    };

    const result = await data.fetchData(pathOptions, routerOptions, locals);
    assertExists(result);
    assert(result && typeof result === 'object');
    assert('posts' in result);
    assert('meta' in result);
    assert('data' in result);
    assert(result.data && typeof result.data === 'object');
    assert('tag' in result.data);

    assert.equal(result.posts.length, posts.length);
    assert.equal(result.data.tag.length, tags.length);

    sinon.assert.calledOnce(browsePostsStub);
    assert('include' in browsePostsStub.firstCall.args[0]);
    assert.equal(browsePostsStub.firstCall.args[0].filter, 'tags:testing');
    assert(!('slug' in browsePostsStub.firstCall.args[0]));
    assert.equal(readTagsStub.firstCall.args[0].slug, 'testing');
    // The read defaults for tags are resolved alongside the slug
    assert.equal(readTagsStub.firstCall.args[0].visibility, 'public');
  });

  it('should handle shorthand data entries', async function () {
    const routerOptions = {
      data: { 'my-tag': 'tag.bacon' },
    };

    const result = await data.fetchData({}, routerOptions, locals);

    assert('my-tag' in result.data);
    assert.equal(result.data['my-tag'].length, tags.length);
    assert.equal(readTagsStub.firstCall.args[0].slug, 'bacon');
  });

  it('should not mutate the route data it was given', async function () {
    const routeData = { post: { type: 'browse', resource: 'posts' } };

    await data.fetchData({}, { data: routeData }, locals);

    assert.deepEqual(routeData, { post: { type: 'browse', resource: 'posts' } });
  });

  it('should apply the per-name query defaults without losing the resolved resource', async function () {
    // `post` is one of the names that carries default options, so the
    // defaults are merged in on top of what the adapter resolved.
    const routerOptions = {
      data: { post: { type: 'browse', resource: 'posts' } },
    };

    const result = await data.fetchData({}, routerOptions, locals);

    sinon.assert.calledTwice(browsePostsStub);
    assert.equal(browsePostsStub.secondCall.args[0].include, 'authors,tags,tiers');

    // The response is still keyed off the resolved `posts` resource
    assert.equal(result.data.post.length, posts.length);
    assert.deepEqual(result.data.post.meta, { pagination: { pages: 2 } });
  });
});
