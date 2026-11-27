import assert from 'node:assert/strict';

const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

type Agent = Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;

/** The members each test starts with, by first name, with their labels, status and newsletters. */
const MEMBERS = {
  ada: { labels: ['vip'], status: 'free', subscribed: true },
  grace: { labels: ['vip'], status: 'paid', subscribed: true },
  alan: { labels: [], status: 'paid', subscribed: true },
  linus: { labels: [], status: 'free', subscribed: false },
} as const;
const NAMES = Object.keys(MEMBERS).sort();

const emailOf = (name: string) => `${name}@negated-filter.example`;
const nameOf = (email: string) => email.replace('@negated-filter.example', '');

/** Members filters that leave out what a bracketed group matches, as in -(label:vip). */
describe('Members filtered with a negated group', function () {
  let agent: Agent;
  let newsletter: { id: string };

  /** The names of the members `filter` selects on the members list. */
  async function membersList(filter?: string): Promise<string[]> {
    const query = filter === undefined ? '' : `&filter=${encodeURIComponent(filter)}`;
    const { body } = await agent.get(`members/?limit=all${query}`).expectStatus(200);
    return body.members.map((member: { email: string }) => nameOf(member.email)).sort();
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'newsletters');
    await agent.loginAsOwner();
    const { body } = await agent
      .get(`newsletters/?filter=${encodeURIComponent('status:active')}&limit=1`)
      .expectStatus(200);
    newsletter = body.newsletters[0];
  });

  beforeEach(async function () {
    await agent.delete('members/?all=true').expectStatus(200);
    for (const [name, member] of Object.entries(MEMBERS)) {
      await agent
        .post('members/')
        .body({
          members: [
            {
              email: emailOf(name),
              name,
              labels: [...member.labels],
              newsletters: member.subscribed ? [{ id: newsletter.id }] : [],
            },
          ],
        })
        .expectStatus(201);
      await models.Base.knex('members')
        .where({ email: emailOf(name) })
        .update({ status: member.status });
    }
  });

  afterAll(async function () {
    await agent.delete('members/?all=true').expectStatus(200);
  });

  it('lists everyone but the members a group selects', async function () {
    assert.deepEqual(await membersList('-(label:vip+status:paid)'), ['ada', 'alan', 'linus']);
  });

  it('lists everyone but the members subscribed to a newsletter', async function () {
    assert.deepEqual(await membersList('-(subscribed:true)'), ['linus']);
  });

  it('labels exactly the members a negated group selects', async function () {
    const { body } = await agent
      .post('labels/')
      .body({ labels: [{ name: 'Not VIP' }] })
      .expectStatus(201);
    const label = body.labels[0];

    await agent
      .put(`members/bulk/?filter=${encodeURIComponent('-(label:vip)')}`)
      .body({ bulk: { action: 'addLabel', meta: { label: { id: label.id } } } })
      .expectStatus(200);

    assert.deepEqual(await membersList(`label:${label.slug}`), ['alan', 'linus']);
  });

  it('deletes exactly the members a negated group selects', async function () {
    await agent.delete(`members/?filter=${encodeURIComponent('-(label:vip)')}`).expectStatus(200);

    assert.deepEqual(await membersList(), ['ada', 'grace']);
  });

  it('deletes nobody for a negated group on a restricted field', async function () {
    await agent
      .delete(`members/?filter=${encodeURIComponent("-(password:'guess')")}`)
      .expectStatus(400);

    assert.deepEqual(await membersList(), NAMES);
  });
});
