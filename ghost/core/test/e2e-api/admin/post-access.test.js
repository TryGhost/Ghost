const assert = require('node:assert/strict');
const models = require('../../../core/server/models');
const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');

describe('Post access capability', function () {
  let admin;
  let members;
  const posts = {};

  beforeAll(async function () {
    const agents = await agentProvider.getAgentsForMembers();
    admin = agents.adminAgent;
    members = agents.membersAgent;
    await fixtureManager.init('posts', 'members');
    await admin.loginAsOwner();
    for (const visibility of ['public', 'members', 'paid']) {
      const result = await admin
        .post('posts/')
        .body({ posts: [{ title: `${visibility} access`, status: 'published', visibility }] })
        .expectStatus(201);
      posts[visibility] = result.body.posts[0].id;
    }
  });

  it('returns anonymous context and evaluates public access through the authenticated batch endpoint', async function () {
    const context = await members.get('/api/member/context/').expectStatus(200);
    assert.deepEqual(context.body, { member: null });
    assert.match(context.headers['cache-control'], /private/);
    assert.match(context.headers['cache-control'], /no-store/);
    const response = await admin
      .post('post_access/')
      .body({ post_access: [{ post_ids: Object.values(posts) }] })
      .expectStatus(200);
    assert.match(response.headers['cache-control'], /private/);
    assert.match(response.headers['cache-control'], /no-store/);
    assert.deepEqual(
      response.body.post_access,
      Object.entries(posts).map(([visibility, id]) => ({
        id,
        access: visibility === 'public',
        visible_card_ids: [],
      })),
    );
  });
  it('issues the existing credential and applies current free, paid and selected-tier access', async function () {
    const tier = await models.Product.findOne({ type: 'paid' }, { require: true });
    const created = await admin
      .post('posts/')
      .body({
        posts: [
          {
            title: 'Tier access',
            status: 'published',
            visibility: 'tiers',
            tiers: [{ id: tier.id }],
          },
        ],
      })
      .expectStatus(201);
    posts.tiers = created.body.posts[0].id;
    const signedIn = members.duplicate();
    await signedIn.loginAs('access-reader@example.com');
    const context = await signedIn.get('/api/member/context/').expectStatus(200);
    const credential = context.body.member;
    assert.equal(Object.keys(credential).sort().join(','), 'key,uuid');
    await members
      .get(`/api/member/newsletters/?uuid=${credential.uuid}&key=${credential.key}`)
      .expectStatus(200);
    const member = await models.Member.findOne({ email: 'access-reader@example.com' });
    for (const [status, products, allowed] of [
      ['free', [], ['public', 'members']],
      ['paid', [], ['public', 'members', 'paid']],
      ['comped', [{ id: tier.id }], ['public', 'members', 'paid', 'tiers']],
      ['free', [], ['public', 'members']],
    ]) {
      await models.Member.edit({ status, products }, { id: member.id });
      const result = await admin
        .post('post_access/')
        .body({ post_access: [{ post_ids: Object.values(posts), member: credential }] })
        .expectStatus(200);
      assert.deepEqual(
        result.body.post_access,
        Object.entries(posts).map(([visibility, id]) => ({
          id,
          access: allowed.includes(visibility),
          visible_card_ids: [],
        })),
      );
    }
    await admin.delete(`members/${member.id}/`).expectStatus(204);
    await admin
      .post('post_access/')
      .body({ post_access: [{ post_ids: Object.values(posts), member: credential }] })
      .expectStatus(401);
    const deletedContext = await signedIn.get('/api/member/context/').expectStatus(200);
    assert.deepEqual(deletedContext.body, { member: null });
  });

  it('rejects invalid credentials and bounds input; unpublished and unknown IDs never grant access', async function () {
    for (const member of [
      {},
      { uuid: 'invalid', key: 'invalid' },
      { uuid: '00000000-0000-0000-0000-000000000000', key: 'wrong' },
    ]) {
      const invalid = await admin
        .post('post_access/')
        .body({ post_access: [{ post_ids: [], member }] })
        .expectStatus(401);
      assert.equal(invalid.body.errors[0].code, 'MEMBER_CREDENTIAL_INVALID');
    }
    for (const post_ids of [null, ['invalid'], Array(101).fill(posts.public)]) {
      await admin
        .post('post_access/')
        .body({ post_access: [{ post_ids }] })
        .expectStatus(422);
    }
    const draft = await admin
      .post('posts/')
      .body({ posts: [{ title: 'Unpublished', visibility: 'public' }] })
      .expectStatus(201);
    const ids = [draft.body.posts[0].id, '000000000000000000000000'];
    const result = await admin
      .post('post_access/')
      .body({ post_access: [{ post_ids: ids }] })
      .expectStatus(200);
    assert.deepEqual(
      result.body.post_access,
      ids.map((id) => ({ id, access: false, visible_card_ids: [] })),
    );
  });

  it('returns preview-aware card IDs and withdraws unpublished, scheduled, and deleted cards', async function () {
    const card = (id) => ({
      type: 'addon',
      version: 1,
      id,
      addonHandle: 'podcast',
      blockName: 'episode',
      props: {},
      publicProps: {},
      html: '<p>Episode</p>',
    });
    const lexical = JSON.stringify({
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [card('preview'), { type: 'paywall', version: 1 }, card('full')],
      },
    });
    const created = await admin
      .post('posts/')
      .body({
        posts: [{ title: 'Preview episode', visibility: 'paid', status: 'published', lexical }],
      })
      .expectStatus(201);
    const id = created.body.posts[0].id;
    const anonymous = await admin
      .post('post_access/')
      .body({ post_access: [{ post_ids: [id, id] }] })
      .expectStatus(200);
    assert.deepEqual(anonymous.body.post_access, [
      { id, access: false, visible_card_ids: ['preview'] },
    ]);
    const signedIn = members.duplicate();
    await signedIn.loginAs('preview-reader@example.com');
    const credential = (await signedIn.get('/api/member/context/').expectStatus(200)).body.member;
    const member = await models.Member.findOne({ email: 'preview-reader@example.com' });
    await models.Member.edit({ status: 'comped' }, { id: member.id });
    const entitled = await admin
      .post('post_access/')
      .body({ post_access: [{ post_ids: [id], member: credential }] })
      .expectStatus(200);
    assert.deepEqual(entitled.body.post_access, [
      { id, access: true, visible_card_ids: ['preview', 'full'] },
    ]);
    const draft = await admin
      .put(`posts/${id}/`)
      .body({ posts: [{ status: 'draft', updated_at: created.body.posts[0].updated_at }] })
      .expectStatus(200);
    const unpublished = await admin
      .post('post_access/')
      .body({ post_access: [{ post_ids: [id], member: credential }] })
      .expectStatus(200);
    assert.deepEqual(unpublished.body.post_access, [{ id, access: false, visible_card_ids: [] }]);
    await admin
      .put(`posts/${id}/`)
      .body({
        posts: [
          {
            status: 'scheduled',
            updated_at: draft.body.posts[0].updated_at,
            published_at: new Date(Date.now() + 86400000).toISOString(),
          },
        ],
      })
      .expectStatus(200);
    const scheduled = await admin
      .post('post_access/')
      .body({ post_access: [{ post_ids: [id], member: credential }] })
      .expectStatus(200);
    assert.deepEqual(scheduled.body.post_access, [{ id, access: false, visible_card_ids: [] }]);
    await admin.delete(`posts/${id}/`).expectStatus(204);
    const deleted = await admin
      .post('post_access/')
      .body({ post_access: [{ post_ids: [id], member: credential }] })
      .expectStatus(200);
    assert.deepEqual(deleted.body.post_access, [{ id, access: false, visible_card_ids: [] }]);
  });

  it('requires Admin authentication and permits a custom integration key', async function () {
    const created = await admin
      .post('integrations/')
      .body({ integrations: [{ name: 'Access provider' }] })
      .expectStatus(201);
    const key = created.body.integrations[0].api_keys.find((item) => item.type === 'admin').secret;
    admin.resetAuthentication();
    await admin
      .post('post_access/')
      .body({ post_access: [{ post_ids: [] }] })
      .expectStatus(403);
    await admin.useToken(...key.split(':'));
    try {
      const result = await admin
        .post('post_access/')
        .body({ post_access: [{ post_ids: [posts.public] }] })
        .expectStatus(200);
      assert.deepEqual(result.body.post_access, [
        { id: posts.public, access: true, visible_card_ids: [] },
      ]);
    } finally {
      await admin.loginAsOwner();
    }
  });
});
