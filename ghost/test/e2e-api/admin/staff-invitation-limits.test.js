/* global vi */
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
const spamPrevention = require('../../../core/server/web/shared/middleware/api/spam-prevention');

describe('Trial staff invitation limits', function () {
  let request;
  let originalLimits;
  let send;
  let clock;

  beforeAll(async function () {
    await localUtils.startGhost();
    request = supertest.agent(config.get('url'));
    await localUtils.doAuth(request, 'invites');
    await testUtils.initFixtures('api_keys');
    originalLimits = config.get('hostSettings:staffInvites');
  });

  beforeEach(async function () {
    clock = sinon.useFakeTimers({ now: Date.now(), toFake: ['Date'] });
    spamPrevention.reset();
    await dbUtils.truncate('brute');
    await dbUtils.truncate('actions');
    await dbUtils.truncate('invites');
    config.set('hostSettings:staffInvites', {
      maxStaff: 10,
      maxInvites: 15,
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

  function invite(email, roleName = 'Contributor', integration = false, session = request) {
    const role = testUtils.getExistingData().roles.find((entry) => entry.name === roleName);
    const client = integration ? supertest(config.get('url')) : session;
    const call = client
      .post(localUtils.API.getApiQuery('invites/'))
      .set('Origin', config.get('url'));
    if (integration) {
      call.set('Authorization', `Ghost ${localUtils.getValidAdminToken('/admin/')}`);
    }
    return call.send({ invites: [{ email, role_id: role.id }] });
  }

  async function nextMinute() {
    clock.tick(60_001);
  }

  function invitationActions() {
    return db.knex('actions').where({ resource_type: 'invite', event: 'added' });
  }

  describe('with a two-staff plan', function () {
    const planLimits = require('../../../core/server/services/limits');
    let originalPlanLimits;
    let userStatuses;

    beforeEach(async function () {
      originalPlanLimits = config.get('hostSettings:limits');
      config.set('hostSettings:limits', {
        staff: { max: 2, error: 'Your plan supports up to {{max}} staff users.' },
      });
      planLimits.init();
      userStatuses = await db.knex('users').select('id', 'status');
      const ownerRole = await db.knex('roles').where({ name: 'Owner' }).first();
      const owner = await db.knex('roles_users').where({ role_id: ownerRole.id }).first();
      await db.knex('users').whereNot('id', owner.user_id).update({ status: 'inactive' });
    });

    afterEach(async function () {
      for (const user of userStatuses) {
        await db.knex('users').where({ id: user.id }).update({ status: user.status });
      }
      config.set('hostSettings:limits', originalPlanLimits);
      planLimits.init();
    });

    it('keeps the plan cap for Editors while Contributors still count toward the trial cap', async function () {
      await invite('plan-editor@example.com', 'Editor').expect(201);
      await nextMinute();
      const rejected = await invite('plan-admin@example.com', 'Administrator').expect(403);
      assert.match(rejected.body.errors[0].context, /plan supports up to 2 staff/);
      assert.equal(await models.Invite.findOne({ email: 'plan-admin@example.com' }), null);
      assert.equal((await invitationActions()).length, 1);

      const users = await db.knex('users').count('id', { as: 'count' }).first();
      const remaining = 10 - Number(users.count) - 1;
      assert.ok(remaining > 0);
      for (let index = 0; index < remaining; index++) {
        await nextMinute();
        await invite(`plan-contributor-${index}@example.com`).expect(201);
      }
      await nextMinute();
      const full = await invite('plan-extra-contributor@example.com').expect(403);
      assert.match(full.body.errors[0].context, /10 staff.*Contributors/);
      sinon.assert.callCount(send, remaining + 1);
    });

    it('does not let a Contributor promotion bypass the plan cap', async function () {
      const contributor = await models.User.add(
        {
          name: 'Trial contributor',
          email: 'trial-created-promotion@example.com',
          roles: ['Contributor'],
        },
        { context: { internal: true } },
      );
      await invite('promotion-editor@example.com', 'Editor').expect(201);
      const role = testUtils
        .getExistingData()
        .roles.find((entry) => entry.name === 'Administrator');
      const rejected = await request
        .put(localUtils.API.getApiQuery(`users/${contributor.id}/`))
        .set('Origin', config.get('url'))
        .send({ users: [{ roles: [{ id: role.id }] }] })
        .expect(403);
      assert.match(rejected.body.errors[0].context, /plan supports up to 2 staff/);
      const retained = await models.User.findOne(
        { id: contributor.id },
        { withRelated: ['roles'] },
      );
      assert.equal(retained.hasRole('Contributor'), true);
    });

    it('does not let unsuspending staff bypass the plan cap', async function () {
      const author = await models.User.add(
        {
          name: 'Suspended trial author',
          email: 'trial-created-unsuspend@example.com',
          roles: ['Author'],
          status: 'inactive',
        },
        { context: { internal: true } },
      );
      await invite('unsuspend-editor@example.com', 'Editor').expect(201);
      const rejected = await request
        .put(localUtils.API.getApiQuery(`users/${author.id}/`))
        .set('Origin', config.get('url'))
        .send({ users: [{ status: 'active' }] })
        .expect(403);
      assert.match(rejected.body.errors[0].context, /plan supports up to 2 staff/);
      const retained = await db.knex('users').where({ id: author.id }).first();
      assert.equal(retained.status, 'inactive');
    });
  });

  it('counts Contributor resends and stops the sixteenth email with an upgrade message', async function () {
    for (let index = 0; index < 15; index++) {
      await invite('quota@example.com').expect(201);
      await nextMinute();
    }
    const original = await models.Invite.findOne({ email: 'quota@example.com' });
    const rejected = await invite('quota@example.com').expect(403);
    assert.equal(rejected.body.errors[0].type, 'HostLimitError');
    assert.match(rejected.body.errors[0].context, /15 staff invitation emails/);
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
    assert.match(rejected.body.errors[0].context, /10 staff.*Contributors/);
    assert.equal(await models.Invite.findOne({ email: 'eleventh@example.com' }), null);
    sinon.assert.callCount(send, remaining + 1);
  });

  it('shares the minute across recipients, API keys, staff sessions and IP addresses', async function () {
    await invite('integration@example.com', 'Contributor', true)
      .set('X-Forwarded-For', '192.0.2.1')
      .expect(201);
    await invite('burst-2@example.com').set('X-Forwarded-For', '192.0.2.2').expect(201);
    await invite('burst-3@example.com').set('X-Forwarded-For', '192.0.2.3').expect(201);
    spamPrevention.reset();
    spamPrevention.globalBlock();
    const rejected = await invite('other@example.com', 'Author').expect(429);
    assert.equal(rejected.body.errors[0].code, 'STAFF_INVITE_RATE_LIMIT');
    assert.ok(Number(rejected.headers['retry-after']) > 0);
    sinon.assert.callCount(send, 3);
    await nextMinute();
    await invite('other@example.com', 'Author').expect(201);
    const recorded = await invitationActions();
    assert.equal(recorded.length, 4);
    assert.deepEqual(recorded.map((action) => action.actor_type).sort(), [
      'integration',
      'user',
      'user',
      'user',
    ]);
  });

  it('counts registered addresses, validation errors and permission denials toward the burst limit', async function () {
    await invite(testUtils.DataGenerator.Content.users[0].email).expect(422);
    await invite('not-an-email').expect(422);
    await invite('owner-role@example.com', 'Owner').expect(403);
    await invite('burst-full@example.com').expect(429);
    assert.deepEqual(await invitationActions(), []);
    sinon.assert.notCalled(send);
    await nextMinute();
    await invite('valid@example.com').expect(201);
    assert.equal((await invitationActions()).length, 1);
  });

  it('counts authenticated Contributor attempts toward the shared burst limit', async function () {
    const contributor = await models.User.add(
      {
        name: 'Trial contributor',
        email: 'trial-created-burst-contributor@example.com',
        password: 'Sl1m3rson99',
        roles: ['Contributor'],
        status: 'active',
      },
      { context: { internal: true } },
    );
    const contributorSession = supertest.agent(config.get('url'));
    contributorSession.user = { email: contributor.get('email') };
    await testUtils.API.login(contributorSession, localUtils.API.getApiQuery('session/'));
    for (let i = 0; i < 3; i++) {
      await invite(
        `unauthorized-${i}@example.com`,
        'Contributor',
        false,
        contributorSession,
      ).expect(403);
    }
    await invite('owner@example.com').expect(429);
    sinon.assert.notCalled(send);
    await nextMinute();
    await invite('owner@example.com').expect(201);
    sinon.assert.calledOnce(send);
  });

  it('does not consume the shared burst allowance before authentication', async function () {
    for (let i = 0; i < 4; i++) {
      await supertest(config.get('url'))
        .post(localUtils.API.getApiQuery('invites/'))
        .set('Origin', config.get('url'))
        .send({
          invites: [{ email: 'anonymous@example.com', role_id: testUtils.roles.ids.author }],
        })
        .expect(403);
    }
    for (let i = 0; i < 3; i++) {
      await invite(`authenticated-${i}@example.com`).expect(201);
    }
    await invite('fourth@example.com').expect(429);
    sinon.assert.callCount(send, 3);
  });

  it('allows a steady request every fifty seconds without extending the window', async function () {
    for (let i = 0; i < 4; i++) {
      await invite('steady@example.com').expect(201);
      clock.tick(50_000);
    }
    sinon.assert.callCount(send, 4);
  });

  it('keeps the existing invitation and token when a resend is rate limited', async function () {
    const email = 'rate@example.com';
    await invite(email).expect(201);
    await invite('burst-2@example.com').expect(201);
    await invite('burst-3@example.com').expect(201);
    const original = await models.Invite.findOne({ email });
    await invite(email).expect(429);
    const retained = await models.Invite.findOne({ email });
    assert.equal(retained.id, original.id);
    assert.equal(retained.get('token'), original.get('token'));
    sinon.assert.callCount(send, 3);
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
    await invite('transport@example.com').expect(500);
    await invite('transport@example.com').expect(500);
    await invite('transport@example.com').expect(429);
    assert.equal((await invitationActions()).length, 3);
    sinon.assert.callCount(send, 3);
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
    for (let i = 0; i < 5; i++) {
      await invite(`paid-${i}@example.com`).expect(201);
    }
    sinon.assert.callCount(send, 5);
  });
  it('counts imported staff toward subsequent invitations without emailing them', async function () {
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
    await models.User.add(
      {
        name: 'Imported extra author',
        email: 'trial-created-extra@example.com',
        roles: ['Contributor'],
      },
      { importing: true, context: { internal: true } },
    );
    const response = await invite('blocked-after-import@example.com').expect(403);
    assert.match(response.body.errors[0].context, /10 staff/);
    assert.deepEqual(await invitationActions(), []);
    sinon.assert.notCalled(send);
  });

  it('rejects unauthenticated garbage tokens without taking the staff lock', async function () {
    const security = require('@tryghost/security');
    const invitesService = require('../../../core/server/services/invites').default;
    const lock = sinon
      .stub(invitesService.service.invitationLimiter, 'lockStaffUsage')
      .rejects(new Error('Invalid tokens must not reach the shared lock'));
    const transaction = sinon.spy(models.Base, 'transaction');
    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        supertest(config.get('url'))
          .post(localUtils.API.getApiQuery('authentication/invitation/'))
          .send({
            invitation: [
              {
                token: security.url.encodeBase64(`invalid-invitation-${i}`),
                name: 'Invalid invite',
                password: 'Sl1m3rson99',
              },
            ],
          })
          .expect(404),
      ),
    );
    sinon.assert.notCalled(lock);
    sinon.assert.notCalled(transaction);
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
    await supertest(config.get('url'))
      .post(localUtils.API.getApiQuery('authentication/invitation/'))
      .send({
        invitation: [
          {
            token: security.url.encodeBase64(pending.get('token')),
            name: 'Accepted contributor',
            password: 'Sl1m3rson99',
          },
        ],
      })
      .expect(200);
    assert.equal(await models.Invite.findOne({ email: 'trial-created-0@example.com' }), null);
    const total =
      Number((await db.knex('users').count('id', { as: 'count' }).first()).count) +
      Number((await db.knex('invites').count('id', { as: 'count' }).first()).count);
    assert.equal(total, 10);
    assert.equal((await invitationActions()).length, remaining);
  });

  it('allows resending and accepting an existing invite after imports exceed the cap', async function () {
    const email = 'trial-created-coeditor@example.com';
    await invite(email).expect(201);
    for (let i = 0; i < 11; i++) {
      await models.User.add(
        {
          name: `Imported ${i}`,
          email: `trial-created-import-${i}@example.com`,
          roles: ['Contributor'],
        },
        { importing: true, context: { internal: true } },
      );
    }
    const seatsBefore =
      Number((await db.knex('users').count('id', { as: 'count' }).first()).count) + 1;
    await invite(email).expect(201);
    assert.equal((await invitationActions()).length, 2);
    sinon.assert.calledTwice(send);
    await invite('new-after-import@example.com').expect(403);
    const pending = await models.Invite.findOne({ email });
    const security = require('@tryghost/security');
    await supertest(config.get('url'))
      .post(localUtils.API.getApiQuery('authentication/invitation/'))
      .send({
        invitation: [
          {
            token: security.url.encodeBase64(pending.get('token')),
            name: 'Accepted contributor',
            password: 'Sl1m3rson99',
          },
        ],
      })
      .expect(200);
    assert.equal(await models.Invite.findOne({ email }), null);
    assert.equal(
      Number((await db.knex('users').count('id', { as: 'count' }).first()).count),
      seatsBefore,
    );
    assert.equal((await invitationActions()).length, 2);
    sinon.assert.calledTwice(send);
  });

  it('records both additions and the deletion when resending an invitation', async function () {
    const original = await invite('resend-history@example.com').expect(201);
    const replacement = await invite('resend-history@example.com').expect(201);
    await vi.waitFor(async () => {
      const rows = await db
        .knex('actions')
        .where({ resource_type: 'invite' })
        .whereIn('resource_id', [original.body.invites[0].id, replacement.body.invites[0].id]);
      assert.equal(rows.filter((row) => row.event === 'added').length, 2);
      const deleted = rows.filter((row) => row.event === 'deleted');
      assert.equal(deleted.length, 1);
      assert.equal(deleted[0].resource_id, original.body.invites[0].id);
    });
    assert.notEqual(replacement.body.invites[0].id, original.body.invites[0].id);
    sinon.assert.calledTwice(send);
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
