import assert from 'node:assert/strict';
import sinon from 'sinon';
import { PASSWORD_PLACEHOLDER } from '../../../core/server/auth/better-auth/credential-password';

const testUtils = require('../../utils');
const db = require('../../../core/server/data/db');
const models = require('../../../core/server/models');
const ghostBookshelf = require('../../../core/server/models/base');

async function credentialHash(userId: string): Promise<string> {
  const row = await db
    .knex('user_accounts')
    .where({ provider_id: 'credential', user_id: userId })
    .first('password');
  return row.password;
}

describe('Legacy password store', function () {
  beforeAll(async function () {
    await testUtils.startGhost();
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('User.lock', function () {
    it('locks the user and rotates the credential row in one transaction', async function () {
      const id = await db
        .knex('users')
        .whereNot({ status: 'inactive' })
        .first('id')
        .then((u: { id: string }) => u.id);
      const before = await credentialHash(id);
      const transaction = sinon.spy(ghostBookshelf, 'transaction');

      const user = await models.User.findOne({ id }, { status: 'all' });
      await user.lock();

      sinon.assert.calledOnce(transaction);
      const { status, password } = await db.knex('users').where({ id }).first('status', 'password');
      assert.equal(status, 'locked');
      assert.equal(password, PASSWORD_PLACEHOLDER);
      assert.notEqual(await credentialHash(id), before);
    });
  });
});
