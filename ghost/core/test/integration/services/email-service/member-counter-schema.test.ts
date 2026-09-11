import assert from 'node:assert/strict';
import ObjectID from 'bson-objectid';
import type { Knex } from 'knex';

const models = require('../../../../core/server/models');
const db: { knex: Knex } = require('../../../../core/server/data/db');
const dbUtils = require('../../../utils/db-utils');

// The legacy Bookshelf models are untyped; keep that boundary separate from the test fixtures.
type Email = InstanceType<typeof models.Email>;

describe('Member counter schema through Bookshelf', function () {
  let email: Email;
  beforeAll(async function () {
    await dbUtils.reset();
  });
  beforeEach(async function () {
    email = await models.Email.add({
      post_id: ObjectID().toHexString(),
      submitted_at: new Date(),
      email_count: 0,
      recipient_filter: 'all',
    });
  });
  afterEach(async function () {
    await db.knex('email_batches').where('email_id', email.id).del();
    await db.knex('emails').where('id', email.id).del();
  });

  it('keeps existing batch callers opted out when they omit counter enrollment', async function () {
    const batch = await models.EmailBatch.add({ email_id: email.id });
    const saved = await db.knex('email_batches').where('id', batch.id).first();
    assert.equal(Boolean(saved.member_counters_enabled), false);
    assert.equal(saved.member_counters_applied_at, null);
  });

  it('preserves explicit enrollment across reads and ordinary status updates', async function () {
    const batch = await models.EmailBatch.add({
      email_id: email.id,
      member_counters_enabled: true,
    });
    const loaded = await models.EmailBatch.findOne({ id: batch.id }, { require: true });
    await loaded.save({ status: 'submitting' }, { patch: true });
    assert.equal(
      Boolean(
        (await db.knex('email_batches').where('id', batch.id).first()).member_counters_enabled,
      ),
      true,
    );
  });
});
