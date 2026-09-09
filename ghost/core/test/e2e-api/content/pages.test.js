const assert = require('node:assert/strict');
const moment = require('moment');

const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const config = require('../../../core/shared/config');
const { agentProvider, fixtureManager, matchers } = require('../../utils/e2e-framework');
const { anyContentVersion, anyEtag, anyUuid, anyISODateTimeWithTZ } = matchers;

const pageMatcher = {
  published_at: anyISODateTimeWithTZ,
  created_at: anyISODateTimeWithTZ,
  updated_at: anyISODateTimeWithTZ,
  uuid: anyUuid,
};

describe('Pages Content API', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getContentAPIAgent();
    await fixtureManager.init(
      'users',
      'user:inactive',
      'posts',
      'tags:extra',
      'api_keys',
      'newsletters',
    );
    await agent.authenticate();

    const pageId = fixtureManager.get('posts', 5).id;
    await models.Post.edit(
      {
        email_recipient_filter: 'status:paid',
        locale: 'fr',
        newsletter_id: fixtureManager.get('newsletters', 0).id,
      },
      { id: pageId, context: { internal: true }, importing: true },
    );
    await models.PostsMeta.add(
      {
        post_id: pageId,
        email_only: true,
        email_subject: 'private page email subject',
      },
      { context: { internal: true } },
    );
  });

  it('Can request pages', async function () {
    const res = await agent
      .get(`pages/`)
      .expectStatus(200)
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      })
      .matchBodySnapshot({
        pages: new Array(5).fill(pageMatcher),
      });

    assert.equal(res.body.pages[0].slug, 'about');

    const urlParts = new URL(res.body.pages[0].url);
    const configUrl = new URL(config.get('url'));
    assert.equal(urlParts.protocol, configUrl.protocol);
    assert.equal(urlParts.host, configUrl.host);
  });

  it('Ignores hidden selectors in page read request bodies', async function () {
    const page = fixtureManager.get('posts', 5);

    for (const identifier of [{ id: page.id }, { slug: page.slug }, { uuid: page.uuid }]) {
      for (const selectors of [
        { locale: 'not-the-stored-locale' },
        { newsletter_id: '000000000000000000000000' },
        { email_recipient_filter: 'not-the-stored-filter' },
        { published_by: '000000000000000000000000' },
        { html: 'not-the-stored-body' },
        { lexical: 'not-the-stored-body' },
        { mobiledoc: 'not-the-stored-body' },
        { plaintext: 'not-the-stored-body' },
      ]) {
        const { body } = await agent
          .get(`pages/${page.id}/?fields=id,slug,uuid`, { body: { ...identifier, ...selectors } })
          .expectStatus(200);

        assert.deepEqual(body.pages, [{ id: page.id, slug: page.slug, uuid: page.uuid }]);
      }
    }
  });

  it('Rejects page read bodies without a public identifier', async function () {
    const page = fixtureManager.get('posts', 5);

    for (const body of [
      { locale: 'fr' },
      { newsletter_id: fixtureManager.get('newsletters', 0).id },
    ]) {
      await agent.get(`pages/${page.id}/`, { body }).expectStatus(400);
    }
  });

  it('Ignores ordering by fields that are not exposed', async function () {
    const { body: defaultBody } = await agent.get('pages/?limit=all').expectStatus(200);
    const defaultIds = defaultBody.pages.map((page) => page.id);

    for (const order of [
      'email_only asc',
      'email_recipient_filter asc',
      'recipient_filter asc',
      'filter asc',
      'email_subject asc',
      'subject asc',
      'locale asc',
      'newsletter_id asc',
    ]) {
      await agent
        .get(`pages/?limit=all&order=${encodeURIComponent(order)}`)
        .expectStatus(200)
        .expect(({ body }) => {
          assert.deepEqual(
            body.pages.map((page) => page.id),
            defaultIds,
            `order "${order}" should be ignored`,
          );
        });
    }
  });

  it('Ignores filters on hidden page fields', async function () {
    const { body: defaultBody } = await agent.get('pages/?limit=all').expectStatus(200);
    const defaultIds = defaultBody.pages.map((page) => page.id);

    for (const filter of [
      "posts_meta.email_subject:~'private page'",
      'email_only:true',
      'locale:fr',
      `newsletter_id:${fixtureManager.get('newsletters', 0).id}`,
    ]) {
      await agent
        .get(`pages/?limit=all&filter=${encodeURIComponent(filter)}`)
        .expectStatus(200)
        .expect(({ body }) => {
          assert.deepEqual(
            body.pages.map((page) => page.id),
            defaultIds,
            `filter "${filter}" should be ignored`,
          );
        });
    }
  });

  it('Cannot request pages with mobiledoc or lexical formats', async function () {
    await agent
      .get(`pages/?formats=mobiledoc,lexical`)
      .expectStatus(200)
      .matchBodySnapshot({
        pages: new Array(5).fill(pageMatcher),
      });
  });

  it('Cannot request pages with mobiledoc or lexical fields', async function () {
    await agent
      .get(`pages/?fields=mobiledoc,lexical,published_at,created_at,updated_at,uuid`)
      .expectStatus(200)
      .matchBodySnapshot({
        pages: new Array(5).fill(pageMatcher),
      });
  });

  it('Can request page', async function () {
    const res = await agent
      .get(`pages/${fixtureManager.get('posts', 5).id}/`)
      .expectStatus(200)
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      })
      .matchBodySnapshot({
        pages: new Array(1).fill(pageMatcher),
      });

    assert.equal(res.body.pages[0].slug, fixtureManager.get('posts', 5).slug);

    const urlParts = new URL(res.body.pages[0].url);
    const configUrl = new URL(config.get('url'));
    assert.equal(urlParts.protocol, configUrl.protocol);
    assert.equal(urlParts.host, configUrl.host);
  });

  it('Can include free and paid tiers for public post', async function () {
    const publicPost = testUtils.DataGenerator.forKnex.createPost({
      type: 'page',
      slug: 'free-to-see',
      visibility: 'public',
      published_at: moment().add(15, 'seconds').toDate(), // here to ensure sorting is not modified
    });
    await models.Post.add(publicPost, { context: { internal: true } });

    const publicPostRes = await agent
      .get(`pages/${publicPost.id}/?include=tiers`)
      .expectStatus(200);
    const publicPostData = publicPostRes.body.pages[0];
    assert.equal(publicPostData.tiers.length, 2);
  });

  it('Can include free and paid tiers for members only post', async function () {
    const membersPost = testUtils.DataGenerator.forKnex.createPost({
      type: 'page',
      slug: 'thou-shalt-not-be-seen',
      visibility: 'members',
      published_at: moment().add(45, 'seconds').toDate(), // here to ensure sorting is not modified
    });
    await models.Post.add(membersPost, { context: { internal: true } });

    const membersPostRes = await agent
      .get(`pages/${membersPost.id}/?include=tiers`)
      .expectStatus(200);
    const membersPostData = membersPostRes.body.pages[0];
    assert.equal(membersPostData.tiers.length, 2);
  });

  it('Can include only paid tier for paid post', async function () {
    const paidPost = testUtils.DataGenerator.forKnex.createPost({
      type: 'page',
      slug: 'thou-shalt-be-paid-for',
      visibility: 'paid',
      published_at: moment().add(30, 'seconds').toDate(), // here to ensure sorting is not modified
    });
    await models.Post.add(paidPost, { context: { internal: true } });

    const paidPostRes = await agent.get(`pages/${paidPost.id}/?include=tiers`).expectStatus(200);
    const paidPostData = paidPostRes.body.pages[0];
    assert.equal(paidPostData.tiers.length, 1);
  });

  it('Can include specific tier for page with tiers visibility', async function () {
    const res = await agent.get(`tiers/`).expectStatus(200);

    const jsonResponse = res.body;
    const paidTier = jsonResponse.tiers.find((p) => p.type === 'paid');

    const tiersPage = testUtils.DataGenerator.forKnex.createPost({
      slug: 'thou-shalt-be-for-specific-tiers',
      type: 'page',
      visibility: 'tiers',
      published_at: moment().add(30, 'seconds').toDate(), // here to ensure sorting is not modified
    });

    tiersPage.tiers = [paidTier];

    await models.Post.add(tiersPage, { context: { internal: true } });

    const tiersPostRes = await agent.get(`pages/${tiersPage.id}/?include=tiers`).expectStatus(200);

    const tiersPostData = tiersPostRes.body.pages[0];

    assert.equal(tiersPostData.tiers.length, 1);
  });
});
