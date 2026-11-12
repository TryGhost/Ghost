import assert from 'node:assert/strict';
import sinon from 'sinon';

const rootPath = require.resolve('../../../../../core/server/services/audience-feedback');
const urlUtils = require('../../../../../core/shared/url-utils').default;
const urlService = require('../../../../../core/server/services/url');
const models = require('../../../../../core/server/models');

describe('Audience feedback service root', function () {
  const sandbox = sinon.createSandbox();
  const postId = '634fc3901e0a291855d8b135';
  let previousModule: NodeJS.Module | undefined;
  let homeUrl: sinon.SinonStub;
  let findPost: sinon.SinonStub;
  let routePost: sinon.SinonStub;
  let modelQueries: sinon.SinonStub[];

  beforeEach(function () {
    previousModule = require.cache[rootPath];
    delete require.cache[rootPath];
    homeUrl = sandbox.stub(urlUtils, 'urlFor').returns('https://import.example/');
    findPost = sandbox.stub(models.Post, 'findOne').resolves(null);
    routePost = sandbox.stub(urlService, 'getUrlForResource').returns('https://site.example/post/');
    modelQueries = [
      findPost,
      sandbox.stub(models.Member, 'findOne'),
      ...['findOne', 'findPage', 'add', 'edit'].map((method) =>
        sandbox.stub(models.MemberFeedback, method),
      ),
    ];
  });

  afterEach(function () {
    sandbox.restore();
    delete require.cache[rootPath];
    if (previousModule) {
      require.cache[rootPath] = previousModule;
    }
  });

  it('captures the home URL at initialization and retains the complete composition on repeated init', async function () {
    const audienceFeedback = require(rootPath).default;
    sinon.assert.notCalled(homeUrl);
    homeUrl.returns('https://initialized.example/blog/');

    await audienceFeedback.init();
    const { service, controller, repository } = audienceFeedback.service;
    homeUrl.returns('https://changed.example/');
    await audienceFeedback.init();

    assert.equal(audienceFeedback.service.service, service);
    assert.equal(audienceFeedback.service.controller, controller);
    assert.equal(audienceFeedback.service.repository, repository);
    assert.equal(
      service.buildEmailLink({ id: postId }, 1),
      `https://initialized.example/blog/members/feedback/${postId}/1/?uuid=%%{uuid}%%&key=%%{key}%%`,
    );
    assert.equal(
      service.buildFallbackLink('member', postId, 0, 'key').href,
      `https://initialized.example/blog/#/feedback/${postId}/0/?uuid=member&key=key`,
    );
    sinon.assert.calledOnceWithExactly(homeUrl, 'home', true);
    for (const query of modelQueries) {
      sinon.assert.notCalled(query);
    }
    sinon.assert.notCalled(routePost);
  });

  it('keeps the retained controller connected to its repository and live URL routing', async function () {
    const audienceFeedback = require(rootPath).default;
    homeUrl.returns('https://site.example/');
    await audienceFeedback.init();
    const controller = audienceFeedback.service.controller;
    const post = { id: postId, status: 'published', tags: [], authors: [] };
    const req = {
      params: { postId, score: '1' },
      query: { uuid: 'member+/id', key: 'signed+key=' },
    };
    const res = { redirect: sandbox.stub() };
    const next = sandbox.stub();
    findPost.resolves(post);
    routePost.returns('https://site.example/current-slug/');

    await audienceFeedback.init();
    await controller.redirectToPost(req, res, next);

    sinon.assert.calledOnceWithExactly(
      findPost,
      { id: postId, status: 'all' },
      { withRelated: ['tags', 'authors'] },
    );
    sinon.assert.calledOnceWithExactly(routePost, { ...post, type: 'posts' }, { absolute: true });
    sinon.assert.calledOnceWithExactly(
      res.redirect,
      `https://site.example/current-slug/#/feedback/${postId}/1/?uuid=member%2B%2Fid&key=signed%2Bkey%3D`,
    );
    sinon.assert.notCalled(next);
  });

  it('propagates home URL construction failure and permits a later initialization attempt', async function () {
    const audienceFeedback = require(rootPath).default;
    const failure = new Error('Home URL is unavailable');
    homeUrl.throws(failure);

    await assert.rejects(audienceFeedback.init(), (error) => error === failure);

    homeUrl.returns('https://recovered.example/');
    await audienceFeedback.init();

    assert.equal(
      audienceFeedback.service.service.buildEmailLink({ id: postId }, 0),
      `https://recovered.example/members/feedback/${postId}/0/?uuid=%%{uuid}%%&key=%%{key}%%`,
    );
    assert.equal(typeof audienceFeedback.service.controller.redirectToPost, 'function');
    sinon.assert.calledTwice(homeUrl);
  });
});
