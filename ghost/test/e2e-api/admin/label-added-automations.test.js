const assert = require('node:assert/strict');
const path = require('node:path');
const sinon = require('sinon');
const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const membersService = require('../../../core/server/services/members');
const {
  LabelAddedToMembersEvent,
} = require('../../../core/server/services/automations/events/label-added-to-members-event');
const DomainEvents = require('@tryghost/domain-events');
const logging = require('@tryghost/logging');

describe('Label-added automation notifications', function () {
  let agent;
  let membersAgent;
  let notify;
  let dispatch;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    membersAgent = await agentProvider.getMembersAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters');
    await agent.loginAsOwner();
  });

  beforeEach(function () {
    notify = sinon.stub().resolves();
    sinon.stub(membersService.api.members, '_automationsApi').value({ notify });
    dispatch = sinon.spy(DomainEvents, 'dispatch');
  });

  afterEach(async function () {
    await DomainEvents.allSettled();
    sinon.restore();
  });

  const additions = () => [
    ...notify.args.map(([event]) => event).filter((event) => event.eventName === 'label_added'),
    ...dispatch.args
      .map(([event]) => event)
      .filter((event) => event instanceof LabelAddedToMembersEvent)
      .map((event) => ({ eventName: 'label_added', ...event.data })),
  ];
  const bulk = (ids, label, action = 'addLabel') =>
    agent
      .put(`/members/bulk/?filter=id:[${ids.join(',')}]`)
      .body({ bulk: { action, meta: { label: { id: label.id } } } })
      .expectStatus(200);

  async function addMember(email, labels = []) {
    const { body } = await agent
      .post('/members/')
      .body({ members: [{ email, labels }] })
      .expectStatus(201);
    await DomainEvents.allSettled();
    return body.members[0];
  }

  it('dispatches label handoff for Admin create and edit, but not existing labels', async function () {
    const member = await addMember('automation-label-api@example.com', [{ name: 'API Label' }]);
    assert.deepEqual(additions(), [
      { eventName: 'label_added', labelId: member.labels[0].id, memberIds: [member.id] },
    ]);
    notify.resetHistory();
    dispatch.resetHistory();
    await agent
      .put(`/members/${member.id}/`)
      .body({ members: [{ labels: [{ name: 'API Label' }, { name: 'Second API Label' }] }] })
      .expectStatus(200);
    await DomainEvents.allSettled();
    const second = await models.Label.findOne({ name: 'Second API Label' });
    assert.deepEqual(additions(), [
      { eventName: 'label_added', labelId: second.id, memberIds: [member.id] },
    ]);
  });

  it('dispatches label handoff when signup token assigns labels', async function () {
    const email = 'automation-label-signup@example.com';
    const magicLink = await membersService.api.getMagicLink(email, 'signup', {
      labels: ['Signup Event'],
    });
    const token = new URL(magicLink).searchParams.get('token');
    await membersAgent.get(`/?token=${token}`).expectStatus(302);
    await DomainEvents.allSettled();
    const member = await models.Member.findOne({ email }, { withRelated: ['labels'] });
    assert.ok(member);
    const label = member
      .related('labels')
      .models.find((item) => item.get('name') === 'Signup Event');
    assert.ok(label);
    assert.deepEqual(additions(), [
      { eventName: 'label_added', labelId: label.id, memberIds: [member.id] },
    ]);
  });

  it('dispatches label handoff for CSV imports using actual resulting label IDs', async function () {
    const { body } = await agent
      .post('/members/upload/')
      .attach(
        'membersfile',
        path.join(__dirname, '../../utils/fixtures/csv/valid-members-labels.csv'),
      )
      .expectStatus(201);
    await DomainEvents.allSettled();
    const events = additions();
    assert.equal(body.meta.stats.imported, 2);
    const members = await models.Base.knex('members')
      .whereIn('email', ['member+labels_1@example.com', 'member+labels_2@example.com'])
      .pluck('id');
    const links = await models.Base.knex('members_labels').whereIn('member_id', members);
    assert.deepEqual(
      events
        .flatMap((event) => event.memberIds.map((memberId) => `${memberId}:${event.labelId}`))
        .sort(),
      links.map((link) => `${link.member_id}:${link.label_id}`).sort(),
    );
    for (const event of events) {
      assert.equal(event.memberIds.length, 1);
      const link = await models.Base.knex('members_labels')
        .where({ member_id: event.memberIds[0], label_id: event.labelId })
        .first();
      assert.ok(link, 'notification must identify a committed import assignment');
    }
  });

  it('notifies bulk additions once, skips existing pairs, and notifies re-adds', async function () {
    const label = await models.Label.add({ name: 'Bulk event label' });
    const existing = await addMember('automation-label-existing@example.com', [
      { name: label.get('name') },
    ]);
    const added = await addMember('automation-label-new@example.com');
    notify.resetHistory();
    dispatch.resetHistory();
    await bulk([existing.id, added.id], label);
    assert.deepEqual(additions(), [
      { eventName: 'label_added', labelId: label.id, memberIds: [added.id] },
    ]);
    await bulk([existing.id, added.id], label);
    assert.equal(additions().length, 1);
    const links = await models.Base.knex('members_labels').where('label_id', label.id);
    assert.equal(links.length, 2, 'no physical duplicate link rows');
    await bulk([added.id], label, 'removeLabel');
    await bulk([added.id], label);
    assert.equal(additions().length, 2);
  });

  it('serializes overlapping additions without duplicate links or notifications', async function () {
    const label = await models.Label.add({ name: 'Concurrent event label' });
    const member = await addMember('automation-label-concurrent@example.com');
    notify.resetHistory();
    dispatch.resetHistory();
    await Promise.all([bulk([member.id], label), bulk([member.id], label)]);
    assert.deepEqual(additions(), [
      { eventName: 'label_added', labelId: label.id, memberIds: [member.id] },
    ]);
    assert.equal((await models.Base.knex('members_labels').where('label_id', label.id)).length, 1);
  });

  it('allows disjoint additions of same label without gap-lock deadlocks', async function () {
    const label = await models.Label.add({ name: 'Disjoint event label' });
    const members = [
      await addMember('automation-label-disjoint-1@example.com'),
      await addMember('automation-label-disjoint-2@example.com'),
    ];
    notify.resetHistory();
    dispatch.resetHistory();
    const original = models.Member.lockForUpdate;
    let count = 0;
    let release;
    const ready = new Promise((resolve) => {
      release = resolve;
    });
    sinon.stub(models.Member, 'lockForUpdate').callsFake(async function (...args) {
      const rows = await original.apply(this, args);
      count += 1;
      if (count === 2) {
        release();
      }
      await ready;
      return rows;
    });
    await Promise.all(members.map((member) => bulk([member.id], label)));
    assert.deepEqual(
      additions()
        .flatMap((event) => event.memberIds)
        .sort(),
      members.map((member) => member.id).sort(),
    );
  });

  it('keeps API success and committed labels when notify rejects', async function () {
    const log = sinon.stub(logging, 'error');
    const member = await addMember('automation-label-failure@example.com');
    const label = await models.Label.add({ name: 'Failure event label' });
    notify.rejects(new Error('notification failed'));
    await bulk([member.id], label);
    assert.ok(additions().length);
    assert.ok(await models.Base.knex('members_labels').where('member_id', member.id).first());
    sinon.assert.called(log);
  });
});
