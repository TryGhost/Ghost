const assert = require('node:assert/strict');
const sinon = require('sinon');
const urlService = require('../../../../../../../../../core/server/services/url');
const commentMapper = require('../../../../../../../../../core/server/api/endpoints/utils/serializers/output/mappers/comments');

describe('Unit: endpoints/utils/serializers/output/mappers/comments', function () {
  let getUrlForResourceStub;

  beforeEach(function () {
    getUrlForResourceStub = sinon
      .stub(urlService, 'getUrlForResource')
      .returns('https://example.com/resolved/');
  });

  afterEach(function () {
    sinon.restore();
  });

  function makeFrame() {
    return {
      apiType: 'members',
      options: {},
      original: {},
    };
  }

  function makeComment(post) {
    return {
      id: 'comment-id',
      html: '<p>comment</p>',
      status: 'published',
      post,
    };
  }

  it('resolves a comment on a post with the posts router type', function () {
    commentMapper(
      makeComment({
        id: 'post-id',
        uuid: 'post-uuid',
        title: 'A post',
        slug: 'a-post',
        type: 'post',
        status: 'published',
      }),
      makeFrame(),
    );

    sinon.assert.calledOnce(getUrlForResourceStub);
    const [resource] = getUrlForResourceStub.firstCall.args;
    assert.equal(resource.type, 'posts');
  });

  it('resolves a comment on a page with the pages router type', function () {
    // Comments are enabled on pages too. The lazy URL service routes by
    // the passed type: a page typed 'posts' is matched against the post
    // collections' filters, matches none, and resolves to /404/.
    commentMapper(
      makeComment({
        id: 'page-id',
        uuid: 'page-uuid',
        title: 'A page',
        slug: 'a-page',
        type: 'page',
        status: 'published',
      }),
      makeFrame(),
    );

    sinon.assert.calledOnce(getUrlForResourceStub);
    const [resource] = getUrlForResourceStub.firstCall.args;
    assert.equal(resource.type, 'pages');
  });

  it('defaults to the posts router type when the post relation carries no type', function () {
    commentMapper(
      makeComment({
        id: 'post-id',
        uuid: 'post-uuid',
        title: 'A post',
        slug: 'a-post',
        status: 'published',
      }),
      makeFrame(),
    );

    sinon.assert.calledOnce(getUrlForResourceStub);
    const [resource] = getUrlForResourceStub.firstCall.args;
    assert.equal(resource.type, 'posts');
  });

  describe('post excerpt', function () {
    let labsStub;

    beforeEach(function () {
      const labs = require('../../../../../../../../../core/shared/labs');
      labsStub = sinon.stub(labs, 'isSet').returns(false);
    });

    it('prefers custom_excerpt over plaintext and stored auto_excerpt', function () {
      const mapped = commentMapper(
        makeComment({
          id: 'post-id',
          uuid: 'post-uuid',
          title: 'A post',
          type: 'post',
          custom_excerpt: 'custom wins',
          plaintext: 'plaintext body',
          auto_excerpt: 'stored should not win',
        }),
        makeFrame(),
      );

      assert.equal(mapped.post.excerpt, 'custom wins');
    });

    it('slices plaintext when storedPostMetadata is off', function () {
      labsStub.withArgs('storedPostMetadata').returns(false);
      const plaintext = 'a'.repeat(600);

      const mapped = commentMapper(
        makeComment({
          id: 'post-id',
          uuid: 'post-uuid',
          title: 'A post',
          type: 'post',
          plaintext,
          auto_excerpt: 'stored should be ignored',
        }),
        makeFrame(),
      );

      assert.equal(mapped.post.excerpt, 'a'.repeat(500));
    });

    it('prefers stored auto_excerpt when storedPostMetadata is on', function () {
      labsStub.withArgs('storedPostMetadata').returns(true);

      const mapped = commentMapper(
        makeComment({
          id: 'post-id',
          uuid: 'post-uuid',
          title: 'A post',
          type: 'post',
          plaintext: 'plaintext body that should be ignored',
          auto_excerpt: 'stored excerpt for comments',
        }),
        makeFrame(),
      );

      assert.equal(mapped.post.excerpt, 'stored excerpt for comments');
    });

    it('falls back to plaintext when stored auto_excerpt is null with flag on', function () {
      labsStub.withArgs('storedPostMetadata').returns(true);

      const mapped = commentMapper(
        makeComment({
          id: 'post-id',
          uuid: 'post-uuid',
          title: 'A post',
          type: 'post',
          plaintext: 'fallback plaintext excerpt',
          auto_excerpt: null,
        }),
        makeFrame(),
      );

      assert.equal(mapped.post.excerpt, 'fallback plaintext excerpt');
    });

    it('omits excerpt when no excerpt source is available', function () {
      const mapped = commentMapper(
        makeComment({
          id: 'post-id',
          uuid: 'post-uuid',
          title: 'A post',
          type: 'post',
        }),
        makeFrame(),
      );

      assert.equal(Object.prototype.hasOwnProperty.call(mapped.post, 'excerpt'), false);
    });
  });
});
