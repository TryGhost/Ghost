const assert = require('node:assert/strict');
const supertest = require('supertest');
const sinon = require('sinon');
const ObjectId = require('bson-objectid').default;
const errors = require('@tryghost/errors');
const testUtils = require('../../utils');
const dbUtils = require('../../utils/db-utils');
const config = require('../../../core/shared/config');
const db = require('../../../core/server/data/db');
const models = require('../../../core/server/models');
const mailService = require('../../../core/server/lib/mail');
const localUtils = require('./utils');

describe('Trial staff invitation limits', function () {
  let request;
  let originalLimits;
  let send;

  beforeAll(async function () {
    await localUtils.startGhost();
    request = supertest.agent(config.get('url'));
    await localUtils.doAuth(request, 'invites');
    await testUtils.initFixtures('api_keys');
    originalLimits = config.get('hostSettings:staffInvites');
  });

  beforeEach(async function () {
    await dbUtils.truncate('brute');
    await dbUtils.truncate('actions');
    await dbUtils.truncate('invites');
    config.set('hostSettings:staffInvites', {
      maxStaff: 10,
      maxInvites: 15,
      minIntervalSeconds: 60,
    });
    send = sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail is disabled');
  });

  afterEach(async function () {
    const created = await db
      .knex('users')
      .where('email', 'like', 'trial-created-%@example.com')
      .pluck('id');
    await db.knex('roles_users').whereIn('user_id', created).delete();
    await db.knex('users').whereIn('id', created).delete();
    config.set('hostSettings:staffInvites', originalLimits);
    sinon.restore();
  });

  function invite(email, roleName = 'Contributor', integration = false) {
    const role = testUtils.getExistingData().roles.find((entry) => entry.name === roleName);
    const client = integration ? supertest(config.get('url')) : request;
    const call = client
      .post(localUtils.API.getApiQuery('invites/'))
      .set('Origin', config.get('url'));
    if (integration) {
      call.set('Authorization', `Ghost ${localUtils.getValidAdminToken('/admin/')}`);
    }
    return call.send({ invites: [{ email, role_id: role.id }] });
  }

  async function nextMinute() {
    await db
      .knex('brute')
      .where({ key: 'staff-invites:requests' })
      .update({ lastRequest: Date.now() - 60_001 });
  }

  function invitationActions() {
    return db.knex('actions').where({ resource_type: 'invite', event: 'added' });
  }

  it('counts Contributor resends and stops the sixteenth email with an upgrade message', async function () {
    for (let index = 0; index < 15; index++) {
      await invite('quota@example.com').expect(201);
      await nextMinute();
    }
    const original = await models.Invite.findOne({ email: 'quota@example.com' });
    const rejected = await invite('quota@example.com').expect(403);
    assert.equal(rejected.body.errors[0].type, 'HostLimitError');
    assert.match(rejected.body.errors[0].context, /15 staff invitation emails.*Upgrade/);
    assert.equal((await models.Invite.findOne({ email: 'quota@example.com' })).id, original.id);
    sinon.assert.callCount(send, 15);
    assert.equal(
      (await invitationActions()).length,
      15,
      'one audit entry per send, including resends',
    );
  });

  it('counts the owner, existing users and pending Contributors toward ten seats', async function () {
    const users = await db.knex('users').count('id', { as: 'count' }).first();
    const remaining = 10 - Number(users.count);
    assert.ok(remaining > 0);
    for (let i = 0; i < remaining; i++) {
      await invite(`seat-${i}@example.com`).expect(201);
      await nextMinute();
    }
    await invite('seat-0@example.com').expect(201);
    await nextMinute();
    const rejected = await invite('eleventh@example.com', 'Author').expect(403);
    assert.match(rejected.body.errors[0].context, /10 staff.*Contributors.*Upgrade/);
    assert.equal(await models.Invite.findOne({ email: 'eleventh@example.com' }), null);
    sinon.assert.callCount(send, remaining + 1);
  });

  it('shares the minute across recipients, API keys and staff sessions', async function () {
    await invite('integration@example.com', 'Contributor', true).expect(201);
    const rejected = await invite('other@example.com', 'Author').expect(429);
    assert.equal(rejected.body.errors[0].code, 'STAFF_INVITE_RATE_LIMIT');
    assert.ok(Number(rejected.headers['retry-after']) > 0);
    sinon.assert.calledOnce(send);
    await nextMinute();
    await invite('other@example.com', 'Author').expect(201);
    const recorded = await invitationActions();
    assert.equal(recorded.length, 2);
    assert.deepEqual(recorded.map((action) => action.actor_type).sort(), ['integration', 'user']);
  });

  it('rate limits invalid authenticated requests without consuming the email allowance', async function () {
    await invite('not-an-email').expect(422);
    await invite('valid@example.com').expect(429);
    assert.deepEqual(await invitationActions(), []);
    sinon.assert.notCalled(send);
  });

  it('keeps the existing invitation and token when a resend is rate limited', async function () {
    const email = 'rate@example.com';
    await invite(email).expect(201);
    const original = await models.Invite.findOne({ email });
    await invite(email).expect(429);
    const retained = await models.Invite.findOne({ email });
    assert.equal(retained.id, original.id);
    assert.equal(retained.get('token'), original.get('token'));
    sinon.assert.calledOnce(send);
  });

  it('revoking invites cannot restore the fifteen-email allowance', async function () {
    for (let i = 0; i < 15; i++) {
      const created = await invite(`rotate-${i}@example.com`).expect(201);
      await request
        .delete(localUtils.API.getApiQuery(`invites/${created.body.invites[0].id}/`))
        .set('Origin', config.get('url'))
        .expect(204);
      await nextMinute();
    }
    await invite('rotated-again@example.com').expect(403);
    sinon.assert.callCount(send, 15);
  });

  it('retains a reservation when mail transport fails', async function () {
    send.rejects(new errors.EmailError({ message: 'Transport timed out' }));
    await invite('transport@example.com').expect(500);
    assert.equal((await invitationActions()).length, 1);
    await invite('transport@example.com').expect(429);
    sinon.assert.calledOnce(send);
  });

  it('removes trial caps and rate limiting when the host removes the trial policy', async function () {
    const actor = await db.knex('users').first();
    await db.knex('actions').insert(
      Array.from({ length: 15 }, () => ({
        id: ObjectId().toHexString(),
        resource_type: 'invite',
        resource_id: ObjectId().toHexString(),
        event: 'added',
        actor_type: 'user',
        actor_id: actor.id,
        created_at: new Date(),
      })),
    );
    config.set('hostSettings:staffInvites', undefined);
    await invite('paid-1@example.com').expect(201);
    await invite('paid-2@example.com').expect(201);
    sinon.assert.calledTwice(send);
  });
  it('enforces the same seat cap for imported staff without consuming invitations', async function () {
    const users = await db.knex('users').count('id', { as: 'count' }).first();
    const remaining = 10 - Number(users.count);
    for (let i = 0; i < remaining; i++) {
      await db.knex.transaction(async (transacting) => {
        await models.User.add(
          {
            name: 'Imported contributor',
            email: `trial-created-${i}@example.com`,
            roles: ['Contributor'],
          },
          { importing: true, context: { internal: true }, transacting },
        );
      });
    }
    await assert.rejects(
      models.User.add(
        { name: 'One too many', email: 'trial-created-extra@example.com', roles: ['Contributor'] },
        { importing: true, context: { internal: true } },
      ),
      /10 staff/,
    );
    assert.deepEqual(await invitationActions(), []);
    sinon.assert.notCalled(send);
  });

  it('accepts an invitation at capacity without consuming another seat or email', async function () {
    const users = await db.knex('users').count('id', { as: 'count' }).first();
    const remaining = 10 - Number(users.count);
    for (let i = 0; i < remaining; i++) {
      await invite(`trial-created-${i}@example.com`).expect(201);
      await nextMinute();
    }
    const pending = await models.Invite.findOne({ email: 'trial-created-0@example.com' });
    const security = require('@tryghost/security');
    const invitesService = require('../../../core/server/services/invites').default;
    await invitesService.service.accept({
      invitation: [
        {
          token: security.url.encodeBase64(pending.get('token')),
          name: 'Accepted contributor',
          password: 'Sl1m3rson99',
        },
      ],
    });
    assert.equal(await models.Invite.findOne({ email: 'trial-created-0@example.com' }), null);
    const total =
      Number((await db.knex('users').count('id', { as: 'count' }).first()).count) +
      Number((await db.knex('invites').count('id', { as: 'count' }).first()).count);
    assert.equal(total, 10);
    assert.equal((await invitationActions()).length, remaining);
  });

  it('commits the audit entry before attempting delivery', async function () {
    send.callsFake(async () => {
      const recorded = await invitationActions();
      assert.equal(recorded.length, 1);
      assert.equal(
        recorded[0].resource_id,
        (await models.Invite.findOne({ email: 'durable@example.com' })).id,
      );
      return 'Mail is disabled';
    });
    await invite('durable@example.com').expect(201);
    sinon.assert.calledOnce(send);
  });

  it('does not send or create an invitation if its audit entry cannot be saved', async function () {
    sinon
      .stub(models.Action, 'add')
      .rejects(new errors.InternalServerError({ message: 'Audit insert failed' }));
    await invite('audit-failed@example.com').expect(500);
    assert.equal(await models.Invite.findOne({ email: 'audit-failed@example.com' }), null);
    assert.deepEqual(await invitationActions(), []);
    sinon.assert.notCalled(send);
  });

  it('preserves the original invitation and allowance when recording a resend fails', async function () {
    await invite('resend-audit@example.com').expect(201);
    const original = await models.Invite.findOne({ email: 'resend-audit@example.com' });
    await nextMinute();
    const recordAction = models.Action.add;
    sinon.stub(models.Action, 'add').callsFake(function (action, options) {
      if (action.resource_type === 'invite' && action.event === 'added') {
        return Promise.reject(new errors.InternalServerError({ message: 'Audit insert failed' }));
      }
      return recordAction.call(this, action, options);
    });
    await invite('resend-audit@example.com').expect(500);
    const retained = await models.Invite.findOne({ email: 'resend-audit@example.com' });
    assert.equal(retained.id, original.id);
    assert.equal(retained.get('token'), original.get('token'));
    assert.equal((await invitationActions()).length, 1);
    sinon.assert.calledOnce(send);
  });

  it('retains best-effort audit logging when the trial policy is absent', async function () {
    config.set('hostSettings:staffInvites', undefined);
    sinon
      .stub(models.Action, 'add')
      .rejects(new errors.InternalServerError({ message: 'Audit insert failed' }));
    await invite('paid-audit@example.com').expect(201);
    assert.deepEqual(await invitationActions(), []);
    sinon.assert.calledOnce(send);
  });
});
