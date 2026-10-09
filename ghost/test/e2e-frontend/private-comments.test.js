const { agentProvider, cacheRules, fixtureManager } = require('../utils/e2e-framework');
const models = require('../../core/server/models');
const settingsCache = require('../../core/shared/settings-cache');

describe('Private site comments', function () {
  const accessCode = 'private-comments-test';
  let adminAgent;
  let frontendAgent;
  let ghostServer;
  let comment;
  let originalPrivateSetting;
  let originalPasswordSetting;
  let settingsChanged = false;

  beforeAll(async function () {
    ({ adminAgent, frontendAgent, ghostServer } = await agentProvider.getAgentsWithFrontend());

    await fixtureManager.init('posts', 'members');
    await adminAgent.loginAsOwner();

    originalPrivateSetting = settingsCache.get('is_private');
    originalPasswordSetting = settingsCache.get('password');

    const postId = fixtureManager.get('posts', 0).id;
    await models.Post.edit({ visibility: 'public' }, { id: postId });
    comment = await models.Comment.add({
      post_id: postId,
      member_id: fixtureManager.get('members', 0).id,
      html: '<p>This is a private comment</p>',
      status: 'published',
    });

    await adminAgent
      .put('settings/')
      .body({
        settings: [
          { key: 'password', value: accessCode },
          { key: 'is_private', value: true },
        ],
      })
      .expectStatus(200);
    settingsChanged = true;
  });

  afterAll(async function () {
    try {
      if (settingsChanged) {
        await adminAgent
          .put('settings/')
          .body({
            settings: [
              { key: 'password', value: originalPasswordSetting },
              { key: 'is_private', value: originalPrivateSetting },
            ],
          })
          .expectStatus(200);
      }
    } finally {
      await ghostServer?.stop();
    }
  });

  it('shares private-site access with the comments API', async function () {
    await frontendAgent
      .get(`/members/api/comments/${comment.id}`)
      .expect(403)
      .expect('Cache-Control', cacheRules.private);

    await frontendAgent
      .post('/private/')
      .type('form')
      .send({ password: accessCode })
      .expect(302)
      .expect('Location', '/');

    await frontendAgent
      .get(`/members/api/comments/${comment.id}`)
      .expect(200)
      .expect('Cache-Control', cacheRules.private);
  });
});
