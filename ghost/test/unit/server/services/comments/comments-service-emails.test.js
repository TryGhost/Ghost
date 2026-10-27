const assert = require('node:assert/strict');
const sinon = require('sinon');
const emailService = require('../../../../../core/server/services/email-service');

// The reply notification subject reads `t` through the i18n root when it sends,
// so the root must be initialised first. The root falls back to 'en' when the
// locale setting is not set.
const i18n = require('../../../../../core/server/services/i18n').default;

const CommentsServiceEmails = require('../../../../../core/server/services/comments/comments-service-emails');

describe('Comments Service: CommentsServiceEmails', function () {
  beforeAll(async function () {
    await i18n.init();
  });

  afterEach(function () {
    sinon.restore();
  });

  function createClassInstance({ labs = {} }) {
    const urlService = {
      getUrlForResource: sinon.stub().returns('https://example.com/my-post/'),
    };
    const labsStub = {
      isSet: sinon.stub().callsFake((flag) => labs[flag] || false),
    };

    const instance = new CommentsServiceEmails({
      config: {},
      logging: {},
      models: {},
      mailer: {},
      settingsCache: { get: sinon.stub() },
      settingsHelpers: {},
      urlService,
      urlUtils: {},
      labs: labsStub,
    });

    return { instance, urlService };
  }

  describe('getPostUrl', function () {
    it('returns post URL with comment permalink', function () {
      const { instance } = createClassInstance({});

      const result = instance.getPostUrl({ id: '123' }, '456');

      assert.equal(result, 'https://example.com/my-post/#ghost-comments-456');
    });

    it('passes a posts resource to the URL service', function () {
      const { instance, urlService } = createClassInstance({});

      instance.getPostUrl({ id: '123' }, '456');

      sinon.assert.calledWith(
        urlService.getUrlForResource,
        sinon.match({ id: '123', type: 'posts' }),
        { absolute: true },
      );
    });

    it('passes a pages resource to the URL service for a comment on a page', function () {
      // Comments are enabled on pages too. The lazy URL service routes
      // by the passed type: a page typed 'posts' matches none of the
      // post collections' filters and resolves to /404/, so the
      // notification email links to the 404 page.
      const { instance, urlService } = createClassInstance({});
      const fakeBookshelfModel = {
        toJSON: () => ({ id: '123', slug: 'my-page', type: 'page' }),
      };

      instance.getPostUrl(fakeBookshelfModel, '456');

      sinon.assert.calledWith(
        urlService.getUrlForResource,
        sinon.match({ id: '123', slug: 'my-page', type: 'pages' }),
        { absolute: true },
      );
    });

    it('serialises Bookshelf-model input so spread does not lose the id', function () {
      // Real callers (notify*Authors / notifyParentCommentAuthor / notifyReport)
      // pass a Bookshelf model from Post.findOne. Spreading one with
      // `{...model}` skips prototype getters like `.id`.
      const { instance, urlService } = createClassInstance({});
      const fakeBookshelfModel = {
        toJSON: () => ({ id: '123', slug: 'my-post' }),
      };

      instance.getPostUrl(fakeBookshelfModel, '456');

      sinon.assert.calledWith(
        urlService.getUrlForResource,
        sinon.match({ id: '123', slug: 'my-post', type: 'posts' }),
        { absolute: true },
      );
    });
  });

  function makeModel(attrs, related = {}) {
    return {
      id: attrs.id,
      attributes: attrs,
      get: (key) => attrs[key],
      related: (name) => related[name],
    };
  }

  function makeAuthor(attrs) {
    return makeModel(Object.assign({ comment_notifications: true }, attrs));
  }

  // The comment is created late on 1 April UTC, so a site east of UTC already
  // shows 2 April: the rendered date proves the site timezone was applied.
  const COMMENT_CREATED_AT = new Date('2026-04-01T23:30:00Z');

  function buildHarness(opts = {}) {
    const post = makeModel(Object.assign({ id: 'post-id', title: 'My Post' }, opts.post), {
      authors:
        opts.authors !== undefined
          ? opts.authors
          : [makeAuthor({ email: 'author@example.com', slug: 'author' })],
    });
    const member = makeModel({
      id: 'member-id',
      name: 'Reader',
      email: 'reader@example.com',
      expertise: '',
    });
    const owner = makeModel({ email: 'owner@example.com', slug: 'owner' });
    const comment = makeModel({
      id: 'comment-id',
      post_id: 'post-id',
      member_id: 'member-id',
      html: '<p>hi</p>',
      created_at: COMMENT_CREATED_AT,
    });
    const parentMember = makeModel(
      Object.assign(
        {
          id: 'parent-member-id',
          uuid: 'parent-uuid',
          email: 'parent@example.com',
          enable_comment_notifications: true,
        },
        opts.parentMember,
      ),
    );
    const parentComment = makeModel(
      Object.assign({ id: 'parent-id', status: 'published' }, opts.parentComment),
      { member: parentMember },
    );
    const reply = makeModel({
      id: 'reply-id',
      post_id: 'post-id',
      member_id: 'member-id',
      parent_id: 'parent-id',
      in_reply_to_id: 'in-reply-to-id',
      html: '<p>reply</p>',
      created_at: COMMENT_CREATED_AT,
    });

    const Post = { findOne: sinon.stub().resolves(post) };
    const Member = { findOne: sinon.stub().resolves(member) };
    const User = { getOwnerUser: sinon.stub().resolves(owner) };
    const Comment = { findOne: sinon.stub().resolves(parentComment) };

    const renderStub = sinon.stub().resolves({ html: 'h', text: 't' });
    const mailerSendStub = sinon.stub().resolves();

    // Stub the URL service's getUrlForResource with a withArgs match:
    // the URL only resolves when a resource carrying the post's id
    // is passed. Anything else returns undefined, so a regression
    // that drops `post.id` somewhere between notifyX and the URL
    // service surfaces as a bad URL landing in templateData.
    const getUrlForResourceStub = sinon.stub().returns(undefined);
    getUrlForResourceStub
      .withArgs(sinon.match({ id: 'post-id' }), sinon.match.any)
      .returns('https://example.com/my-post/');
    const urlService = { getUrlForResource: getUrlForResourceStub };

    const instance = new CommentsServiceEmails({
      config: {},
      logging: { warn: sinon.stub() },
      models: { Post, Member, User, Comment },
      mailer: { send: mailerSendStub },
      settingsCache: {
        get: (() => {
          const stub = sinon.stub().returns('Test Site');
          stub.withArgs('timezone').returns(opts.timezone || 'Etc/UTC');
          return stub;
        })(),
      },
      settingsHelpers: { getMembersSupportAddress: () => 'support@example.com' },
      urlService,
      urlUtils: {
        getSiteUrl: () => 'https://example.com/',
        urlFor: () => 'https://example.com/ghost/',
        urlJoin: (...parts) => parts.join(''),
      },
      labs: { isSet: sinon.stub().returns(false) },
    });

    instance.commentsServiceEmailRenderer.renderEmailTemplate = renderStub;
    const getPostUrlSpy = sinon.spy(instance, 'getPostUrl');

    return {
      instance,
      post,
      comment,
      reply,
      parentComment,
      Comment,
      getPostUrlSpy,
      renderStub,
      mailerSendStub,
      urlService,
    };
  }

  // The reply notification builds its unsubscribe link through the Email
  // service's renderer, which only exists once that service has initialised.
  // Define it on the shared root for a test; sinon.restore removes it again.
  function defineEmailRenderer() {
    const createUnsubscribeUrl = sinon
      .stub()
      .returns('https://example.com/unsubscribe/?uuid=parent-uuid&comments=1');
    sinon.define(emailService, 'renderer', { createUnsubscribeUrl });
    return createUnsubscribeUrl;
  }

  // Characterisation tests for the three notification entry points. These
  // exercise the full public path so that future changes to `getPostUrl`'s
  // signature have to migrate every call site coherently — historically
  // line 161 of comments-service-emails.js was missed when the helper was
  // refactored, and the helper-only test above did not catch it.
  describe('public notification methods invoke getPostUrl', function () {
    const POST_URL_FOR_COMMENT = 'https://example.com/my-post/#ghost-comments-comment-id';

    it('notifyPostAuthors: passes the right post arg into getPostUrl and threads the URL into templateData', async function () {
      const { instance, post, comment, getPostUrlSpy, renderStub, urlService } = buildHarness();

      await instance.notifyPostAuthors(comment);

      // The signature on `main` is (postId, commentId). When this test
      // was written the call site at line 51 passes the string id; the
      // upcoming HKG-1761 migration will rewrite it to pass the post
      // model. Either way, the URL must thread through to templateData.
      sinon.assert.calledOnce(getPostUrlSpy);
      const [postArg, commentIdArg] = getPostUrlSpy.firstCall.args;
      assert.equal(commentIdArg, 'comment-id');
      assert.equal(postArg.id, post.id);
      // After this commit's migration the call always passes a model.
      assert.notEqual(typeof postArg, 'string');

      // End-to-end pin: the URL service must receive a resource carrying
      // the post's id. The stub only returns the canonical URL for
      // {id: 'post-id'}, so a regression that drops the id somewhere
      // in the chain surfaces here.
      sinon.assert.calledWith(urlService.getUrlForResource, sinon.match({ id: 'post-id' }));

      sinon.assert.calledOnce(renderStub);
      const [, templateData] = renderStub.firstCall.args;
      assert.equal(templateData.postUrl, POST_URL_FOR_COMMENT);
    });

    it('notifyPostAuthors: skips an author whose email matches the commenting member', async function () {
      const { instance, comment, renderStub } = buildHarness({
        authors: [makeAuthor({ email: 'reader@example.com', slug: 'author' })],
      });

      await instance.notifyPostAuthors(comment);

      sinon.assert.notCalled(renderStub);
    });

    it('notifyParentCommentAuthor: threads the post URL for the reply into templateData', async function () {
      defineEmailRenderer();
      const { instance, reply, renderStub, urlService } = buildHarness();

      await instance.notifyParentCommentAuthor(reply);

      sinon.assert.calledWith(urlService.getUrlForResource, sinon.match({ id: 'post-id' }));
      const [, templateData] = renderStub.firstCall.args;
      assert.equal(templateData.postUrl, 'https://example.com/my-post/#ghost-comments-reply-id');
    });

    it('notifyReport: threads the post URL through to templateData (regression for the missed line-161 migration)', async function () {
      const { instance, post, comment, getPostUrlSpy, renderStub, urlService } = buildHarness();

      await instance.notifyReport(comment, { name: 'Reporter', email: 'reporter@example.com' });

      // The bug we want to catch: if the helper signature changes
      // (postId → post) but this notifyReport call site is not
      // migrated, getPostUrl is invoked with a string and produces
      // a malformed URL. Pin the URL here so a future regression
      // surfaces immediately.
      sinon.assert.calledOnce(getPostUrlSpy);
      const [postArg, commentIdArg] = getPostUrlSpy.firstCall.args;
      assert.equal(commentIdArg, 'comment-id');
      assert.equal(postArg.id, post.id);
      // After this commit's migration the call always passes a model.
      assert.notEqual(typeof postArg, 'string');

      sinon.assert.calledWith(urlService.getUrlForResource, sinon.match({ id: 'post-id' }));

      sinon.assert.calledOnce(renderStub);
      const [, templateData] = renderStub.firstCall.args;
      assert.equal(templateData.postUrl, POST_URL_FOR_COMMENT);
    });

    it('notifyReport: emails the owner a report with the post, member and comment details', async function () {
      const { instance, comment, renderStub, mailerSendStub } = buildHarness();

      await instance.notifyReport(comment, { name: 'Reporter', email: 'reporter@example.com' });

      sinon.assert.calledOnce(renderStub);
      const [template, templateData] = renderStub.firstCall.args;
      assert.equal(template, 'report');
      assert.equal(templateData.postTitle, 'My Post');
      assert.equal(templateData.postUrl, POST_URL_FOR_COMMENT);
      assert.equal(templateData.commentHtml, '<p>hi</p>');
      assert.equal(templateData.memberName, 'Reader');
      assert.equal(templateData.memberEmail, 'reader@example.com');
      assert.equal(templateData.reporter, 'Reporter (reporter@example.com)');
      assert.equal(templateData.toEmail, 'owner@example.com');
      assert.match(templateData.staffUrl, /\/settings\/staff\/owner\/email-notifications$/);
      assert.match(templateData.moderationUrl, /\/comments\/\?id=is:comment-id$/);

      sinon.assert.calledOnceWithMatch(mailerSendStub, {
        to: 'owner@example.com',
        subject: '🚩 A comment has been reported on your post',
        html: 'h',
        text: 't',
      });
    });
  });

  describe('notifyParentCommentAuthor', function () {
    it('emails the parent comment author with the reply and an unsubscribe link', async function () {
      const createUnsubscribeUrl = defineEmailRenderer();
      const { instance, reply, renderStub, mailerSendStub } = buildHarness();

      await instance.notifyParentCommentAuthor(reply);

      sinon.assert.calledOnceWithExactly(createUnsubscribeUrl, 'parent-uuid', { comments: true });
      const [template, templateData] = renderStub.firstCall.args;
      assert.equal(template, 'new-comment-reply');
      assert.equal(templateData.replyHtml, '<p>reply</p>');
      assert.equal(templateData.memberName, 'Reader');
      assert.equal(templateData.toEmail, 'parent@example.com');
      assert.equal(
        templateData.profileUrl,
        'https://example.com/unsubscribe/?uuid=parent-uuid&comments=1',
      );
      sinon.assert.calledOnceWithMatch(mailerSendStub, {
        to: 'parent@example.com',
        from: 'support@example.com',
        forceTextContent: true,
        html: 'h',
        text: 't',
      });
    });

    it('puts the site title in the translated subject', async function () {
      defineEmailRenderer();
      const { instance, reply, mailerSendStub } = buildHarness();

      await instance.notifyParentCommentAuthor(reply);

      assert.equal(
        mailerSendStub.firstCall.args[0].subject,
        '↪️ New reply to your comment on Test Site',
      );
    });

    it('resolves with the notified parent member id', async function () {
      defineEmailRenderer();
      const { instance, reply } = buildHarness();

      const notified = await instance.notifyParentCommentAuthor(reply);

      assert.equal(notified, 'parent-member-id');
    });

    it('reads the unsubscribe link builder from the email service when sending, not at construction', async function () {
      const { instance, reply, renderStub } = buildHarness();
      defineEmailRenderer();

      await instance.notifyParentCommentAuthor(reply);

      const [, templateData] = renderStub.firstCall.args;
      assert.equal(
        templateData.profileUrl,
        'https://example.com/unsubscribe/?uuid=parent-uuid&comments=1',
      );
    });

    it('looks up the parent comment by parent_id by default', async function () {
      defineEmailRenderer();
      const { instance, reply, Comment } = buildHarness();

      await instance.notifyParentCommentAuthor(reply);

      sinon.assert.calledOnceWithExactly(Comment.findOne, { id: 'parent-id' });
    });

    it('looks up the in_reply_to comment for an in_reply_to notification', async function () {
      defineEmailRenderer();
      const { instance, reply, Comment } = buildHarness();

      await instance.notifyParentCommentAuthor(reply, { type: 'in_reply_to' });

      sinon.assert.calledOnceWithExactly(Comment.findOne, { id: 'in-reply-to-id' });
    });

    it('uses a supplied parent comment without querying for it', async function () {
      defineEmailRenderer();
      const { instance, reply, parentComment, Comment, mailerSendStub } = buildHarness();

      await instance.notifyParentCommentAuthor(reply, { parent: parentComment });

      sinon.assert.notCalled(Comment.findOne);
      sinon.assert.calledOnce(mailerSendStub);
    });

    it('does not notify when the parent comment is not published', async function () {
      defineEmailRenderer();
      const { instance, reply, mailerSendStub } = buildHarness({
        parentComment: { status: 'hidden' },
      });

      const notified = await instance.notifyParentCommentAuthor(reply);

      assert.equal(notified, undefined);
      sinon.assert.notCalled(mailerSendStub);
    });

    it('does not notify a parent author who disabled comment notifications', async function () {
      defineEmailRenderer();
      const { instance, reply, mailerSendStub } = buildHarness({
        parentMember: { enable_comment_notifications: false },
      });

      const notified = await instance.notifyParentCommentAuthor(reply);

      assert.equal(notified, undefined);
      sinon.assert.notCalled(mailerSendStub);
    });

    it('does not notify a member replying to their own comment', async function () {
      defineEmailRenderer();
      const { instance, reply, mailerSendStub } = buildHarness({
        parentMember: { id: 'member-id' },
      });

      const notified = await instance.notifyParentCommentAuthor(reply);

      assert.equal(notified, undefined);
      sinon.assert.notCalled(mailerSendStub);
    });
  });

  // The notification templates show the comment's creation date as a calendar
  // day in the site's timezone. Pinned here so a later move of this formatting
  // to the shared clock is checked against the current output.
  describe('notification dates', function () {
    it('notifyPostAuthors renders the comment date as a calendar day in the site timezone', async function () {
      const auckland = buildHarness({ timezone: 'Pacific/Auckland' });
      await auckland.instance.notifyPostAuthors(auckland.comment);
      assert.equal(auckland.renderStub.firstCall.args[1].commentDate, '2 Apr 2026');

      const utc = buildHarness({ timezone: 'Etc/UTC' });
      await utc.instance.notifyPostAuthors(utc.comment);
      assert.equal(utc.renderStub.firstCall.args[1].commentDate, '1 Apr 2026');
    });

    it('notifyParentCommentAuthor renders the reply date as a calendar day in the site timezone', async function () {
      defineEmailRenderer();

      const auckland = buildHarness({ timezone: 'Pacific/Auckland' });
      await auckland.instance.notifyParentCommentAuthor(auckland.reply);
      assert.equal(auckland.renderStub.firstCall.args[1].replyDate, '2 Apr 2026');

      const utc = buildHarness({ timezone: 'Etc/UTC' });
      await utc.instance.notifyParentCommentAuthor(utc.reply);
      assert.equal(utc.renderStub.firstCall.args[1].replyDate, '1 Apr 2026');
    });

    it('notifyReport renders the comment date as a calendar day in the site timezone', async function () {
      const reporter = { name: 'Reporter', email: 'reporter@example.com' };

      const auckland = buildHarness({ timezone: 'Pacific/Auckland' });
      await auckland.instance.notifyReport(auckland.comment, reporter);
      assert.equal(auckland.renderStub.firstCall.args[1].commentDate, '2 Apr 2026');

      const utc = buildHarness({ timezone: 'Etc/UTC' });
      await utc.instance.notifyReport(utc.comment, reporter);
      assert.equal(utc.renderStub.firstCall.args[1].commentDate, '1 Apr 2026');
    });
  });
});
