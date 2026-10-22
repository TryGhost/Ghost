import assert from 'node:assert/strict';
import * as security from '@tryghost/security';
import { agentProvider, fixtureManager } from '../../../utils/e2e-framework';

const models = require('../../../../core/server/models');
// Use the same CommonJS instance that boot initializes.
const invites: typeof import('../../../../core/server/services/invites') = require('../../../../core/server/services/invites');

describe('Invite acceptance with the production models contract', function () {
  let email: string;
  let sequence = 0;
  const password = 'An invitation with a sufficiently long test passphrase!';
  let roleId: string;
  let token: string;

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init();
  });

  beforeEach(async function () {
    sequence += 1;
    email = `acceptance-models-${sequence}@example.com`;
    const role = await models.Role.findOne({ name: 'Author' }, { require: true });
    roleId = role.id;
    const invite = await models.Invite.add(
      { email, role_id: roleId, status: 'sent' },
      { context: { internal: true } },
    );
    token = security.url.encodeBase64(invite.get('token'));
  });

  function accept(name = 'Invited Author') {
    return invites.default.service.accept({
      invitation: [{ token, name, password }],
    });
  }

  it('consumes the invitation and creates the user with the stored role and hashed password', async function () {
    await accept();

    assert.equal(await models.Invite.findOne({ email }), null);
    const user = await models.User.findOne({ email }, { withRelated: ['roles'], require: true });
    assert.equal(user.get('name'), 'Invited Author');
    assert.equal(await security.password.compare(password, user.get('password')), true);
    assert.deepEqual(
      user.related('roles').models.map((role: { id: string }) => role.id),
      [roleId],
    );
    await assert.rejects(accept(), { errorType: 'NotFoundError', message: 'Invite not found.' });
  });

  it('rolls back invitation deletion when the real user model rejects creation', async function () {
    await assert.rejects(accept(''), { errorType: 'ValidationError' });

    assert.ok(await models.Invite.findOne({ email, status: 'sent' }));
    assert.equal(await models.User.findOne({ email }), null);
    // The failed attempt must leave the invitation usable.
    await accept();
    assert.ok(await models.User.findOne({ email }));
  });

  it('allows only one concurrent acceptance of the same invitation', async function () {
    const results = await Promise.allSettled([accept(), accept()]);

    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
    assert.equal(await models.Invite.findOne({ email }), null);
    const users = await models.User.findAll({ filter: `email:${email}` });
    assert.equal(users.length, 1);
  });
});
