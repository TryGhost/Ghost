const PostsService = require('../../../../../core/server/services/posts/posts-service');
const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');

describe('Posts Service', function () {
  it('Can construct class', function () {
    new PostsService({});
  });

  describe('copyPost', function () {
    const makeModelStub = (key, value) => ({
      get(k) {
        if (k === key) {
          return value;
        }
      },
    });

    const POST_ID = 'abc123';

    let postModelStub, existingPostModel, frame;

    const makePostService = () =>
      new PostsService({
        models: {
          Post: postModelStub,
        },
      });

    beforeEach(function () {
      postModelStub = {
        add: sinon.stub(),
        findOne: sinon.stub(),
      };

      existingPostModel = {
        attributes: {
          id: POST_ID,
          title: 'Test Post',
          slug: 'test-post',
          status: 'published',
          newsletter_id: 'abc123',
        },
        related: sinon.stub(),
      };

      frame = {
        options: {
          id: POST_ID,
        },
      };

      postModelStub.findOne
        .withArgs(
          {
            id: POST_ID,
            status: 'all',
          },
          frame.options,
        )
        .resolves(existingPostModel);

      postModelStub.add.resolves();

      existingPostModel.related.withArgs('authors').returns([]);
      existingPostModel.related.withArgs('tags').returns([]);
      existingPostModel.related.withArgs('posts_meta').returns({
        isNew: () => true,
      });
      existingPostModel.related.withArgs('tiers').returns([]);
    });

    it('copies a post', async function () {
      const copiedPost = {
        attributes: {
          id: 'def789',
        },
      };

      postModelStub.add.resolves(copiedPost);

      const result = await makePostService().copyPost(frame);

      // Ensure copied post is created
      sinon.assert.calledOnceWithExactly(postModelStub.add, sinon.match.object, frame.options);

      // Ensure copied post is returned
      assert.deepEqual(result, copiedPost);
    });

    it('omits unnecessary data from the copied post', async function () {
      await makePostService().copyPost(frame);

      const copiedPostData = postModelStub.add.getCall(0).args[0];

      assert.equal(copiedPostData.id, undefined);
      assert.equal(copiedPostData.slug, undefined);
    });

    it('updates the title of the copied post', async function () {
      await makePostService().copyPost(frame);

      const copiedPostData = postModelStub.add.getCall(0).args[0];

      assert.equal(copiedPostData.title, 'Test Post (Copy)');
    });

    it('updates the status of the copied post', async function () {
      await makePostService().copyPost(frame);

      const copiedPostData = postModelStub.add.getCall(0).args[0];

      assert.equal(copiedPostData.status, 'draft');
    });

    it('adds authors to the copied post', async function () {
      existingPostModel.related
        .withArgs('authors')
        .returns([makeModelStub('id', 'author-1'), makeModelStub('id', 'author-2')]);

      await makePostService().copyPost(frame);

      const copiedPostData = postModelStub.add.getCall(0).args[0];

      assert.deepEqual(copiedPostData.authors, [{ id: 'author-1' }, { id: 'author-2' }]);
    });

    it('adds tags to the copied post', async function () {
      existingPostModel.related
        .withArgs('tags')
        .returns([makeModelStub('id', 'tag-1'), makeModelStub('id', 'tag-2')]);

      await makePostService().copyPost(frame);

      const copiedPostData = postModelStub.add.getCall(0).args[0];

      assert.deepEqual(copiedPostData.tags, [{ id: 'tag-1' }, { id: 'tag-2' }]);
    });

    it('adds meta data to the copied post', async function () {
      const postMetaModel = {
        attributes: {
          meta_title: 'Test Post',
          meta_description: 'Test Post Description',
        },
        isNew: () => false,
      };

      existingPostModel.related.withArgs('posts_meta').returns(postMetaModel);

      await makePostService().copyPost(frame);

      const copiedPostData = postModelStub.add.getCall(0).args[0];

      assert.deepEqual(copiedPostData.posts_meta, postMetaModel.attributes);
    });

    it('adds tiers to the copied post', async function () {
      existingPostModel.related
        .withArgs('tiers')
        .returns([makeModelStub('id', 'tier-1'), makeModelStub('id', 'tier-2')]);

      await makePostService().copyPost(frame);

      const copiedPostData = postModelStub.add.getCall(0).args[0];

      assert.deepEqual(copiedPostData.tiers, [{ id: 'tier-1' }, { id: 'tier-2' }]);
    });

    it('omits unnecessary meta data from the copied post', async function () {
      const postMetaModel = {
        attributes: {
          post_id: POST_ID,
          meta_title: 'Test Post',
          meta_description: 'Test Post Description',
          email_only: 1,
          email_subject: 'Test Email Subject',
        },
        isNew: () => false,
      };

      existingPostModel.related.withArgs('posts_meta').returns(postMetaModel);

      await makePostService().copyPost(frame);

      const copiedPostData = postModelStub.add.getCall(0).args[0];

      assert.deepEqual(copiedPostData.posts_meta, {
        meta_title: postMetaModel.attributes.meta_title,
        meta_description: postMetaModel.attributes.meta_description,
      });
    });
  });

  describe('generateCopiedPostLocationFromUrl', function () {
    it('generates a location from the provided url', function () {
      const postsService = new PostsService({});
      const url = 'http://foo.bar/ghost/api/admin/posts/abc123/copy/def456/';
      const expectedUrl = 'http://foo.bar/ghost/api/admin/posts/def456/';

      assert.equal(postsService.generateCopiedPostLocationFromUrl(url), expectedUrl);
    });
  });

  describe('handleCacheInvalidation', function () {
    let postsService;
    let urlUtils;

    beforeEach(function () {
      urlUtils = {
        urlFor: sinon.stub().returns('http://example.com/p/123/'),
        urlJoin: sinon.stub().returns('/p/123/'),
      };
      postsService = new PostsService({ urlUtils });
    });

    it('returns comma-separated URLs for draft posts that were changed', function () {
      const model = {
        get: sinon.stub().returns('draft'),
        previous: sinon.stub().returns('draft'),
        wasChanged: sinon.stub().returns(true),
        uuid: '123',
      };

      const result = postsService.handleCacheInvalidation(model);
      assert.deepEqual(result, {
        value: [
          '/p/123/',
          '/p/123/?member_status=anonymous',
          '/p/123/?member_status=free',
          '/p/123/?member_status=paid',
        ].join(', '),
      });
    });

    it('returns comma-separated URLs for scheduled posts that were changed', function () {
      const model = {
        get: sinon.stub().returns('scheduled'),
        wasChanged: sinon.stub().returns(true),
        uuid: '123',
      };

      const result = postsService.handleCacheInvalidation(model);
      assert.deepEqual(result, {
        value: [
          '/p/123/',
          '/p/123/?member_status=anonymous',
          '/p/123/?member_status=free',
          '/p/123/?member_status=paid',
        ].join(', '),
      });
    });
  });

  describe('editPost', function () {
    let postsService;
    let mockModels;
    let mockEmailService;
    let postEmailHandlerStub;
    const transacting = {};

    beforeEach(function () {
      mockModels = {
        Post: {
          findOne: sinon.stub(),
          edit: sinon.stub(),
          transaction: sinon.stub().callsFake(async (save) => save(transacting)),
        },
        Member: {
          findPage: sinon.stub(),
        },
        Newsletter: {
          findOne: sinon.stub(),
        },
      };

      mockEmailService = {
        checkCanSendEmail: sinon.stub().resolves(),
        createEmail: sinon.stub(),
        retryEmail: sinon.stub(),
      };

      postsService = new PostsService({
        models: mockModels,
        emailService: mockEmailService,
      });

      // Stub the postEmailHandler methods
      postEmailHandlerStub = {
        validateBeforeSave: sinon.stub().resolves(),
        createOrRetryEmail: sinon.stub().resolves(),
      };

      postsService.postEmailHandler = postEmailHandlerStub;
    });

    afterEach(function () {
      sinon.restore();
    });

    it('calls postEmailHandler.validateBeforeSave', async function () {
      const model = {
        get: sinon.stub().returns(null),
        toJSON: sinon.stub().returns({ id: 'post-123' }),
        wasChanged: sinon.stub().returns(false),
      };
      mockModels.Post.edit.resolves(model);

      const frame = {
        data: { posts: [{ status: 'draft' }] },
        options: { id: 'post-123' },
      };

      await postsService.editPost(frame);

      sinon.assert.calledOnceWithExactly(postEmailHandlerStub.validateBeforeSave, frame);
    });

    it('propagates validation errors from validateBeforeSave', async function () {
      const validationError = new Error('Email limit exceeded');
      postEmailHandlerStub.validateBeforeSave.rejects(validationError);

      const frame = {
        data: { posts: [{ status: 'published' }] },
        options: { id: 'post-123', newsletter: 'default' },
      };

      await assert.rejects(postsService.editPost(frame), (err) => {
        assert.equal(err.message, 'Email limit exceeded');
        return true;
      });

      sinon.assert.notCalled(mockModels.Post.edit);
    });

    it('calls createOrRetryEmail after editing post', async function () {
      const model = {
        toJSON: sinon.stub().returns({ id: 'post-123' }),
      };
      const preflight = { emailCount: 42 };
      mockModels.Post.edit.resolves(model);
      postEmailHandlerStub.validateBeforeSave.resolves(preflight);

      const frame = {
        data: { posts: [{ status: 'published' }] },
        options: { id: 'post-123' },
      };

      await postsService.editPost(frame);

      sinon.assert.calledOnceWithExactly(mockModels.Post.edit, frame.data.posts[0], {
        ...frame.options,
        transacting,
      });
      sinon.assert.calledOnceWithExactly(postEmailHandlerStub.createOrRetryEmail, model, {
        preflight,
        transacting,
      });
    });

    it('sends the email after the transaction commits and before responding', async function () {
      let committed = false;
      mockModels.Post.transaction.callsFake(async (save) => {
        const result = await save(transacting);
        committed = true;
        return result;
      });
      const model = { toJSON: sinon.stub().returns({ id: 'post-123' }) };
      mockModels.Post.edit.resolves(model);
      const sendEmail = sinon.stub().callsFake(async () => {
        assert.equal(committed, true);
      });
      postEmailHandlerStub.createOrRetryEmail.resolves(sendEmail);

      await postsService.editPost({
        data: { posts: [{ status: 'published' }] },
        options: { id: 'post-123' },
      });

      sinon.assert.callOrder(sendEmail, model.toJSON);
    });

    describe('with a caller-owned transaction', function () {
      async function editAndCommit(sendEmail) {
        let commit;
        const callerTransacting = {
          executionPromise: new Promise((resolve) => {
            commit = resolve;
          }),
        };
        mockModels.Post.edit.resolves({ toJSON: sinon.stub().returns({ id: 'post-123' }) });
        postEmailHandlerStub.createOrRetryEmail.resolves(sendEmail);

        await postsService.editPost({
          data: { posts: [{ status: 'published' }] },
          options: { id: 'post-123', transacting: callerTransacting },
        });

        sinon.assert.notCalled(mockModels.Post.transaction);
        sinon.assert.calledOnceWithMatch(postEmailHandlerStub.createOrRetryEmail, sinon.match.any, {
          transacting: callerTransacting,
        });
        sinon.assert.notCalled(sendEmail);

        commit();
        await new Promise(setImmediate);
      }

      it('sends the email once the caller commits', async function () {
        const sendEmail = sinon.stub().resolves();
        await editAndCommit(sendEmail);
        sinon.assert.calledOnce(sendEmail);
      });

      it('logs a send error after the caller commits', async function () {
        const error = new Error('Would go over limit');
        const logError = sinon.stub(logging, 'error');
        await editAndCommit(sinon.stub().rejects(error));
        sinon.assert.calledOnceWithExactly(logError, error);
      });
    });

    it('returns post JSON and calls eventHandler', async function () {
      const postData = { id: 'post-123', title: 'Test Post' };
      const model = {
        get: sinon.stub().callsFake((key) => {
          if (key === 'newsletter_id') {
            return null;
          }
          if (key === 'status') {
            return 'published';
          }
        }),
        previous: sinon.stub().withArgs('status').returns('draft'),
        toJSON: sinon.stub().returns(postData),
        wasChanged: sinon.stub().returns(true),
      };
      mockModels.Post.edit.resolves(model);

      const frame = {
        data: { posts: [{ status: 'published' }] },
        options: { id: 'post-123' },
      };

      const eventHandler = sinon.stub();
      const result = await postsService.editPost(frame, { eventHandler });

      assert.deepEqual(result, postData);
      sinon.assert.calledOnceWithExactly(eventHandler, 'published_updated', postData);
    });
  });

  describe('getChanges', function () {
    let postsService;

    beforeEach(function () {
      postsService = new PostsService({});
    });

    it('returns correct change type for status transitions', function () {
      const testCases = [
        // [currentStatus, previousStatus, expected]
        ['published', 'draft', 'published_updated'],
        ['draft', 'published', 'unpublished'],
        ['draft', 'draft', 'draft_updated'],
        ['scheduled', 'draft', 'scheduled_updated'],
      ];

      for (const [currentStatus, previousStatus, expected] of testCases) {
        const model = {
          get: sinon.stub().withArgs('status').returns(currentStatus),
          previous: sinon.stub().withArgs('status').returns(previousStatus),
          wasChanged: sinon.stub().returns(true),
        };

        assert.equal(
          postsService.getChanges(model),
          expected,
          `getChanges with status ${currentStatus} (prev: ${previousStatus}) should be ${expected}`,
        );
      }
    });
  });
});
