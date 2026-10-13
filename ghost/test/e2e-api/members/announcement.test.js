const assert = require('node:assert/strict');
const {
  agentProvider,
  mockManager,
  fixtureManager,
  matchers,
  configUtils,
} = require('../../utils/e2e-framework');
const { anyEtag } = matchers;
const settingsCache = require('../../../core/shared/settings-cache');
const models = require('../../../core/server/models');

describe('Announcement', function () {
  let membersAgent;
  let originalSettings;
  const settingKeys = [
    'announcement_content',
    'announcement_background',
    'announcement_visibility',
  ];

  beforeAll(async function () {
    membersAgent = await agentProvider.getMembersAPIAgent();

    await fixtureManager.init('members');
  });

  beforeEach(function () {
    originalSettings = settingKeys.map((key) => [key, settingsCache.get(key, { resolve: false })]);
  });

  afterEach(async function () {
    for (const [key, entry] of originalSettings) {
      settingsCache.set(key, entry);
    }
    await configUtils.restore();
    mockManager.restore();
  });

  it('Can read announcement endpoint', async function () {
    await membersAgent
      .get(`/api/announcement/`)
      .expectStatus(200)
      .matchHeaderSnapshot({
        etag: anyEtag,
      })
      .matchBodySnapshot();
  });

  it('Can read announcement when it is present in announcement data', async function () {
    settingsCache.set('announcement_content', { value: '<p>Test announcement</p>' });
    settingsCache.set('announcement_visibility', { value: ['visitors'] });

    await membersAgent
      .get(`/api/announcement/`)
      .expectStatus(200)
      .matchHeaderSnapshot({
        etag: anyEtag,
      })
      .matchBodySnapshot();
  });

  it('keeps announcements member-specific and private while settings change', async function () {
    // The fixture called comped@test.com is actually paid.
    const product = await models.Product.findOne({ slug: 'default-product' }, { require: true });
    await models.Member.add(
      {
        email: 'announcement-comped@example.com',
        status: 'comped',
        email_disabled: false,
        products: [{ id: product.id }],
      },
      { context: { internal: true } },
    );
    const free = membersAgent.duplicate();
    const paid = membersAgent.duplicate();
    const comped = membersAgent.duplicate();
    await free.loginAs('member1@test.com');
    await paid.loginAs('paid@test.com');
    await comped.loginAs('announcement-comped@example.com');

    for (const [agent, status] of [
      [free, 'free'],
      [paid, 'paid'],
      [comped, 'comped'],
    ]) {
      const { body } = await agent.get('/api/member/').expectStatus(200);
      assert.equal(body.status, status);
    }

    const expectAnnouncement = async (agent, announcement) => {
      const { body, headers } = await agent.get('/api/announcement/').expectStatus(200);
      assert.deepEqual(body, { announcement: [announcement] });
      const cacheControl = headers['cache-control'].split(',').map((value) => value.trim());
      assert.ok(cacheControl.includes('private'));
      assert.ok(cacheControl.includes('no-store'));
      assert.ok(!cacheControl.includes('public'));
    };

    settingsCache.set('announcement_content', { value: '<p>For paid members</p>' });
    settingsCache.set('announcement_background', { value: 'dark' });
    settingsCache.set('announcement_visibility', { value: ['paid_members'] });
    const paidAnnouncement = {
      announcement: '<p>For paid members</p>',
      announcement_background: 'dark',
    };
    await expectAnnouncement(paid, paidAnnouncement);
    await expectAnnouncement(membersAgent, {});
    await expectAnnouncement(comped, paidAnnouncement);
    await expectAnnouncement(free, {});
    await expectAnnouncement(paid, paidAnnouncement);

    settingsCache.set('announcement_content', { value: '<p>For free members</p>' });
    settingsCache.set('announcement_background', { value: 'light' });
    settingsCache.set('announcement_visibility', { value: ['free_members'] });
    await expectAnnouncement(free, {
      announcement: '<p>For free members</p>',
      announcement_background: 'light',
    });
    await expectAnnouncement(paid, {});
    await expectAnnouncement(comped, {});
    await expectAnnouncement(membersAgent, {});

    settingsCache.set('announcement_visibility', { value: ['visitors'] });
    await expectAnnouncement(membersAgent, {
      announcement: '<p>For free members</p>',
      announcement_background: 'light',
    });
    await expectAnnouncement(free, {});

    settingsCache.set('announcement_visibility', { value: [] });
    await expectAnnouncement(membersAgent, {});
  });
});
