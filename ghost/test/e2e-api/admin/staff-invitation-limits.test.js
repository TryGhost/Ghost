const assert = require('node:assert/strict');
const supertest = require('supertest');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const testUtils = require('../../utils');
const dbUtils = require('../../utils/db-utils');
const config = require('../../../core/shared/config');
const models = require('../../../core/server/models');
const mailService = require('../../../core/server/lib/mail');
const localUtils = require('./utils');

describe('Staff invitation email limits', function () {
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
    config.set('hostSettings:staffInvites', { maxPerDay: 10, cooldownSeconds: 300 });
    send = sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail is disabled');
  });

  afterEach(function () {
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

  it('counts Contributor emails and stops the eleventh email before creating an invite', async function () {
    for (let index = 0; index < 10; index++) {
      await invite(`quota-${index}@example.com`).expect(201);
    }
    const rejected = await invite('over-quota@example.com', 'Author').expect(429);
    assert.equal(rejected.body.errors[0].code, 'STAFF_INVITE_DAILY_LIMIT');
    assert.equal(await models.Invite.findOne({ email: 'over-quota@example.com' }), null);
    sinon.assert.callCount(send, 10);
  });

  it('shares the allowance between API-key and staff-session invitations', async function () {
    config.set('hostSettings:staffInvites', { maxPerDay: 1, cooldownSeconds: 300 });
    await invite('integration-quota@example.com', 'Contributor', true).expect(201);
    const rejected = await invite('session-quota@example.com', 'Author').expect(429);
    assert.equal(rejected.body.errors[0].code, 'STAFF_INVITE_DAILY_LIMIT');
    sinon.assert.calledOnce(send);
  });

  it('keeps the existing invitation and token when a resend is blocked', async function () {
    const email = 'cooldown@example.com';
    await invite(email).expect(201);
    const original = await models.Invite.findOne({ email });
    const rejected = await invite(email).expect(429);
    assert.equal(rejected.body.errors[0].code, 'STAFF_INVITE_COOLDOWN');
    const retained = await models.Invite.findOne({ email });
    assert.equal(retained.id, original.id);
    assert.equal(retained.get('token'), original.get('token'));
    sinon.assert.calledOnce(send);
  });

  it('keeps the recipient cooldown after an invitation is revoked', async function () {
    const email = 'revoked@example.com';
    const created = await invite(email).expect(201);
    await request
      .delete(localUtils.API.getApiQuery(`invites/${created.body.invites[0].id}/`))
      .set('Origin', config.get('url'))
      .expect(204);
    const rejected = await invite(email).expect(429);
    assert.equal(rejected.body.errors[0].code, 'STAFF_INVITE_COOLDOWN');
    sinon.assert.calledOnce(send);
  });

  it('keeps the reservation when the mail transport fails', async function () {
    send.rejects(new errors.EmailError({ message: 'Transport timed out' }));
    await invite('transport-failure@example.com').expect(500);
    const rejected = await invite('transport-failure@example.com').expect(429);
    assert.equal(rejected.body.errors[0].code, 'STAFF_INVITE_COOLDOWN');
    sinon.assert.calledOnce(send);
  });
});
