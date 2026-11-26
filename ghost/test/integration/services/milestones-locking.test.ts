import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import ObjectID from 'bson-objectid';
import sinon from 'sinon';

const testUtils = require('../../utils');
const models = require('../../../core/server/models');
const db = require('../../../core/server/data/db');
const BookshelfMilestoneRepository = require('../../../core/server/services/milestones/bookshelf-milestone-repository');
const MilestoneQueries = require('../../../core/server/services/milestones/milestone-queries');
const MilestonesService = require('../../../core/server/services/milestones/milestones-service');

describe('Milestones: concurrent checks', function () {
  const dispatch = sinon.spy();

  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup('settings'));
  afterAll(testUtils.teardownDb);
  beforeEach(async function () {
    const longAgo = new Date('2020-01-01T00:00:00.000Z');
    await db.knex('milestones').insert([
      { id: new ObjectID().toHexString(), type: 'members', value: 0, created_at: longAgo },
      {
        id: new ObjectID().toHexString(),
        type: 'arr',
        value: 0,
        currency: 'usd',
        created_at: longAgo,
      },
    ]);

    const memberIds = [1, 2, 3].map(() => new ObjectID().toHexString());
    await db.knex('members').insert(
      memberIds.map((id) => ({
        id,
        uuid: crypto.randomUUID(),
        transient_id: crypto.randomUUID(),
        email: `member-${id}@example.com`,
        status: 'free',
        enable_comment_notifications: true,
        email_count: 0,
        email_opened_count: 0,
        email_disabled: false,
        created_at: longAgo,
        updated_at: longAgo,
      })),
    );
    await db.knex('members_paid_subscription_events').insert({
      id: new ObjectID().toHexString(),
      type: 'created',
      member_id: memberIds[0],
      currency: 'usd',
      source: 'stripe',
      mrr_delta: 1000,
      created_at: longAgo,
    });
  });
  afterEach(async function () {
    sinon.restore();
    dispatch.resetHistory();
    await db.knex('milestones').del();
    await db.knex('members_paid_subscription_events').del();
    await db.knex('members').del();
  });

  const createService = (members = [0, 3]) =>
    new MilestonesService({
      repository: new BookshelfMilestoneRepository({
        DomainEvents: { dispatch },
        MilestoneModel: models.Milestone,
        logging: { error: sinon.spy() },
      }),
      queries: new MilestoneQueries({ db, minDaysSinceImported: 7 }),
      milestonesConfig: {
        arr: [{ currency: 'usd', values: [0, 100] }],
        members,
        minDaysSinceLastEmail: 14,
      },
    });

  const storedValues = async (type: 'arr' | 'members') =>
    (await db.knex('milestones').where('type', type).orderBy('value')).map(
      (milestone: { value: number }) => milestone.value,
    );

  it('records a member milestone once when two checks run at the same moment', async function () {
    await Promise.all([
      createService().checkMilestones('members'),
      createService().checkMilestones('members'),
    ]);

    assert.deepEqual(await storedValues('members'), [0, 3]);
    sinon.assert.calledOnce(dispatch);
  });

  it('records an ARR milestone once when two checks run at the same moment', async function () {
    await Promise.all([
      createService().checkMilestones('arr'),
      createService().checkMilestones('arr'),
    ]);

    assert.deepEqual(await storedValues('arr'), [0, 100]);
    sinon.assert.calledOnce(dispatch);
  });

  it('records and announces a milestone when one check runs on its own', async function () {
    const milestone = await createService().checkMilestones('members');

    assert.equal(milestone.value, 3);
    assert.ok(milestone.emailSentAt);
    assert.deepEqual(await storedValues('members'), [0, 3]);
    sinon.assert.calledOnce(dispatch);
    assert.equal(dispatch.firstCall.args[0].data.milestone.value, 3);
  });

  it('records and announces nothing when the check fails part way', async function () {
    sinon
      .stub(MilestoneQueries.prototype, 'hasImportedMembersInPeriod')
      .rejects(new Error('query failed'));

    await assert.rejects(createService([0, 2, 3]).checkMilestones('members'), /query failed/);

    assert.deepEqual(await storedValues('members'), [0]);
    sinon.assert.notCalled(dispatch);
  });
});
