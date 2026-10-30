import assert from 'node:assert/strict';
import { agentProvider, fixtureManager } from '../../utils/e2e-framework';

// @ts-expect-error Module has no type declarations.
import models from '../../../core/server/models';

type Agent = Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;

// An edit locks its record's row but not its relations, so everything that
// changes a record's relations without editing it must lock the record first.
// Otherwise an in-flight edit diffs its relations against rows that changed
// underneath it, e.g. removing the author a staff deletion just promoted.
describe('Relation writers lock the records they change', function () {
  let agent: Agent;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'posts', 'newsletters', 'members:newsletters');
    await agent.loginAsOwner();
  });

  async function recordQueries(run: () => Promise<unknown>) {
    const sqls: string[] = [];
    const onQuery = (data: { sql: string }) => sqls.push(data.sql);

    models.Base.knex.on('query', onQuery);
    try {
      await run();
    } finally {
      models.Base.knex.removeListener('query', onQuery);
    }

    return sqls;
  }

  function assertLockedBeforeWriting(sqls: string[], table: string, linkTable: string) {
    const lock = sqls.findIndex((sql) =>
      new RegExp(`from \`${table}\` .*for update`, 'i').test(sql),
    );
    const write = sqls.findIndex((sql) =>
      new RegExp(`^(insert into|delete from|update) \`${linkTable}\``, 'i').test(sql),
    );

    assert.ok(write >= 0, `expected a write to ${linkTable}`);
    assert.ok(
      lock >= 0 && lock < write,
      `expected ${table} to be locked before writing ${linkTable}:\n${sqls.join('\n')}`,
    );
  }

  async function addPost(data: object = {}) {
    const { body } = await agent
      .post('/posts/')
      .body({ posts: [{ title: 'Locking', ...data }] })
      .expectStatus(201);
    return body.posts[0];
  }

  async function addMember(email: string, labels: object[] = []) {
    const { body } = await agent
      .post('/members/')
      .body({ members: [{ email, labels }] })
      .expectStatus(201);
    return body.members[0];
  }

  it('deleting a tag locks its posts', async function () {
    const tag = await models.Tag.add({ name: 'Locking tag' });
    await addPost({ tags: [{ id: tag.id }] });

    const sqls = await recordQueries(() => agent.delete(`/tags/${tag.id}/`).expectStatus(204));

    assertLockedBeforeWriting(sqls, 'posts', 'posts_tags');
  });

  it('deleting a post locks it', async function () {
    const post = await addPost({ tags: [{ name: 'Locking delete' }] });

    const sqls = await recordQueries(() => agent.delete(`/posts/${post.id}/`).expectStatus(204));

    assertLockedBeforeWriting(sqls, 'posts', 'posts_tags');
  });

  it('bulk adding a tag locks the posts', async function () {
    const post = await addPost();
    const tag = await models.Tag.add({ name: 'Locking bulk tag' });

    const sqls = await recordQueries(() =>
      agent
        .put(`/posts/bulk/?filter=id:'${post.id}'`)
        .body({ bulk: { action: 'addTag', meta: { tags: [{ id: tag.id }] } } })
        .expectStatus(200),
    );

    assertLockedBeforeWriting(sqls, 'posts', 'posts_tags');
  });

  it('bulk changing access to tiers locks the posts', async function () {
    const post = await addPost();
    const tier = await models.Product.findOne({ type: 'paid' }, { require: true });

    const sqls = await recordQueries(() =>
      agent
        .put(`/posts/bulk/?filter=id:'${post.id}'`)
        .body({
          bulk: { action: 'access', meta: { visibility: 'tiers', tiers: [{ id: tier.id }] } },
        })
        .expectStatus(200),
    );

    assertLockedBeforeWriting(sqls, 'posts', 'posts_products');
  });

  it('bulk deleting posts locks them', async function () {
    const post = await addPost();

    const sqls = await recordQueries(() =>
      agent.delete(`/posts/?filter=id:'${post.id}'`).expectStatus(200),
    );

    assertLockedBeforeWriting(sqls, 'posts', 'posts_authors');
  });

  it('deleting a staff user locks their posts', async function () {
    const { body } = await agent.get('/users/?include=roles').expectStatus(200);
    const user = body.users.find((u: any) => u.roles[0].name !== 'Owner');
    await addPost({ authors: [{ id: user.id }], tags: [{ name: 'Locking staff' }] });

    const sqls = await recordQueries(() => agent.delete(`/users/${user.id}/`).expectStatus(204));

    assertLockedBeforeWriting(sqls, 'posts', 'posts_tags');
    assertLockedBeforeWriting(sqls, 'posts', 'posts_authors');
  });

  it('deleting a label locks its members', async function () {
    const label = await models.Label.add({ name: 'Locking label' });
    await addMember('locking-label@example.com', [{ id: label.id, name: label.get('name') }]);
    const links = await models.Base.knex('members_labels').where('label_id', label.id);
    assert.equal(links.length, 1);

    const sqls = await recordQueries(() => agent.delete(`/labels/${label.id}/`).expectStatus(204));

    assertLockedBeforeWriting(sqls, 'members', 'members_labels');
  });

  it('bulk adding and removing a label locks the members', async function () {
    const member = await addMember('locking-bulk-label@example.com');
    const label = await models.Label.add({ name: 'Locking bulk label' });
    const bulk = (action: string) =>
      agent
        .put(`/members/bulk/?filter=id:'${member.id}'`)
        .body({ bulk: { action, meta: { label: { id: label.id } } } })
        .expectStatus(200);

    assertLockedBeforeWriting(
      await recordQueries(() => bulk('addLabel')),
      'members',
      'members_labels',
    );
    assertLockedBeforeWriting(
      await recordQueries(() => bulk('removeLabel')),
      'members',
      'members_labels',
    );
  });

  it('bulk unsubscribing locks the members', async function () {
    const member = await addMember('locking-unsubscribe@example.com');
    const newsletter = await models.Newsletter.findOne({ status: 'active' }, { require: true });
    await agent
      .put(`/members/${member.id}/`)
      .body({ members: [{ newsletters: [{ id: newsletter.id }] }] })
      .expectStatus(200);
    const unsubscribe = (data: object) =>
      agent
        .put(`/members/bulk/?filter=id:'${member.id}'`)
        .body({ bulk: { action: 'unsubscribe', ...data } })
        .expectStatus(200);

    assertLockedBeforeWriting(
      await recordQueries(() => unsubscribe({ newsletter: newsletter.id })),
      'members',
      'members_newsletters',
    );

    await agent
      .put(`/members/${member.id}/`)
      .body({ members: [{ newsletters: [{ id: newsletter.id }] }] })
      .expectStatus(200);
    assertLockedBeforeWriting(
      await recordQueries(() => unsubscribe({})),
      'members',
      'members_newsletters',
    );
  });
});
