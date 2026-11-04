import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import { ActionLog } from '../../../../../core/server/lib/action-log/action-log';
import type { Actor } from '../../../../../core/server/lib/actor';
import { createLoggingFake } from '../../../../utils/logging-utils';

const USER: Actor = { type: 'user', id: '6194d3ce51e2700162531a71' };
const POST_ID = '6194d3ce51e2700162531a72';

async function createDatabase({ withActions = true } = {}): Promise<Knex> {
  const knex = createKnex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    pool: { min: 1, max: 1 },
    useNullAsDefault: true,
  });
  await knex.schema.createTable('posts', (table) => {
    table.string('id', 24).primary();
  });
  if (withActions) {
    await knex.schema.createTable('actions', (table) => {
      table.string('id', 24).primary();
      table.string('resource_id', 24).nullable();
      table.string('resource_type', 50).notNullable();
      table.string('actor_id', 24).notNullable();
      table.string('actor_type', 50).notNullable();
      table.string('event', 50).notNullable();
      table.text('context').nullable();
      table.dateTime('created_at').notNullable();
    });
  }
  return knex;
}

describe('Unit: lib/action-log/action-log', function () {
  let knex: Knex;
  let logging: ReturnType<typeof createLoggingFake>;
  let actionLog: ActionLog;

  beforeEach(async function () {
    knex = await createDatabase();
    logging = createLoggingFake();
    actionLog = new ActionLog({ knex, logging });
  });

  afterEach(async function () {
    await knex.destroy();
  });

  it('stores a change to one resource with its name', async function () {
    await actionLog.record(USER, {
      resourceType: 'gift_link',
      event: 'edited',
      resourceId: POST_ID,
      primaryName: 'A post',
      actionName: 'reset',
    });

    const [row] = await knex('actions').select();
    assert.match(row.id, /^[0-9a-f]{24}$/);
    assert.match(row.created_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.deepEqual(
      { ...row, id: undefined, created_at: undefined },
      {
        id: undefined,
        resource_id: POST_ID,
        resource_type: 'gift_link',
        actor_id: USER.id,
        actor_type: 'user',
        event: 'edited',
        context: JSON.stringify({ primary_name: 'A post', action_name: 'reset' }),
        created_at: undefined,
      },
    );
  });

  it('stores extra context after the name', async function () {
    await actionLog.record(USER, {
      resourceType: 'member_custom_field',
      event: 'edited',
      resourceId: POST_ID,
      primaryName: 'Company',
      context: { key: 'company', previous_name: 'Employer' },
    });

    const [row] = await knex('actions').select();
    assert.equal(
      row.context,
      JSON.stringify({ primary_name: 'Company', key: 'company', previous_name: 'Employer' }),
    );
  });

  it('stores a bulk change without a resource', async function () {
    await actionLog.record(USER, {
      resourceType: 'member_custom_field',
      event: 'edited',
      resourceId: null,
      actionName: 'reordered',
      count: 3,
    });

    const [row] = await knex('actions').select();
    assert.equal(row.resource_id, null);
    assert.equal(row.context, JSON.stringify({ action_name: 'reordered', count: 3 }));
  });

  it('stores no context when there is nothing to say', async function () {
    await actionLog.record(USER, {
      resourceType: 'gift_link',
      event: 'deleted',
      resourceId: null,
    });

    const [row] = await knex('actions').select();
    assert.equal(row.context, null);
  });

  it('gives later actions higher ids', async function () {
    for (let i = 0; i < 3; i++) {
      await actionLog.record(USER, {
        resourceType: 'stripe_checkout_config',
        event: 'edited',
        resourceId: POST_ID,
        primaryName: 'Stripe Checkout',
      });
    }

    const ids = (await knex('actions').select('id')).map(({ id }) => id);
    assert.deepEqual(ids, [...ids].sort());
  });

  it('logs nothing when nobody is acting', async function () {
    await actionLog.record(null, {
      resourceType: 'gift_link',
      event: 'added',
      resourceId: POST_ID,
      primaryName: 'A post',
    });

    assert.equal((await knex('actions').select()).length, 0);
  });

  it('keeps no action when the command rolls back', async function () {
    await assert.rejects(
      knex.transaction(async (transacting) => {
        await transacting('posts').insert({ id: POST_ID });
        await actionLog.record(
          USER,
          { resourceType: 'gift_link', event: 'added', resourceId: POST_ID, primaryName: 'A post' },
          { transacting },
        );
        throw new Error('the command failed');
      }),
      /the command failed/,
    );

    assert.equal((await knex('actions').select()).length, 0);
    assert.equal((await knex('posts').select()).length, 0);
  });

  it('keeps the action when the command commits', async function () {
    await knex.transaction(async (transacting) => {
      await transacting('posts').insert({ id: POST_ID });
      await actionLog.record(
        USER,
        { resourceType: 'gift_link', event: 'added', resourceId: POST_ID, primaryName: 'A post' },
        { transacting },
      );
    });

    assert.equal((await knex('actions').select()).length, 1);
  });

  describe('when the write fails', function () {
    let broken: Knex;

    beforeEach(async function () {
      broken = await createDatabase({ withActions: false });
      actionLog = new ActionLog({ knex: broken, logging });
    });

    afterEach(async function () {
      await broken.destroy();
    });

    it('logs the failure and still resolves', async function () {
      await actionLog.record(USER, {
        resourceType: 'app_installation',
        event: 'installed',
        resourceId: POST_ID,
        primaryName: 'Podcast',
      });

      assert.equal(logging.error.callCount, 1);
      const [entry, message] = logging.error.firstCall.args as [Record<string, unknown>, string];
      assert.equal(message, 'Failed to log an action');
      assert.deepEqual(
        { ...entry, err: undefined },
        {
          event: { name: 'action_log.write_failed' },
          err: undefined,
          action: {
            resource_type: 'app_installation',
            event: 'installed',
            resource_id: POST_ID,
            actor_type: 'user',
            actor_id: USER.id,
          },
        },
      );
      assert.ok(entry.err instanceof Error);
    });

    it("doesn't fail the command's transaction", async function () {
      await broken.transaction(async (transacting) => {
        await transacting('posts').insert({ id: POST_ID });
        await actionLog.record(
          USER,
          { resourceType: 'gift_link', event: 'added', resourceId: POST_ID, primaryName: 'A post' },
          { transacting },
        );
      });

      assert.equal((await broken('posts').select()).length, 1);
      assert.equal(logging.error.callCount, 1);
    });
  });
});

// Checked by the compiler rather than run: a mistake in an action fails to compile.
export function rejectedAtCompileTime(actionLog: ActionLog) {
  void actionLog.record(USER, {
    // @ts-expect-error A kind that isn't in ACTION_KINDS.
    resourceType: 'post',
    event: 'added',
    resourceId: POST_ID,
    primaryName: 'A post',
  });

  // @ts-expect-error A verb the kind doesn't declare.
  void actionLog.record(USER, {
    resourceType: 'stripe_checkout_config',
    event: 'deleted',
    resourceId: POST_ID,
    primaryName: 'Stripe Checkout',
  });

  // @ts-expect-error A change to one resource needs its name.
  void actionLog.record(USER, {
    resourceType: 'gift_link',
    event: 'added',
    resourceId: POST_ID,
  });

  // @ts-expect-error A bulk change belongs to no resource, so has no name.
  void actionLog.record(USER, {
    resourceType: 'gift_link',
    event: 'deleted',
    resourceId: null,
    primaryName: 'A post',
  });
}
