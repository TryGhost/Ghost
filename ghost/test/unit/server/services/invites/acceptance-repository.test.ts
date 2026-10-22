import assert from 'node:assert/strict';
import sinon from 'sinon';
import { ZodError } from 'zod';
import { createAcceptanceRepository } from '../../../../../core/server/services/invites/acceptance-repository';

describe('Invite acceptance repository', function () {
  const transacting = { id: 'transaction' };
  const options = { context: { internal: true }, transacting, forUpdate: true };
  const user = { email: 'invite@example.com', name: 'Invitee', password: 'test', roles: ['role'] };

  function fixture() {
    const attributes: Record<string, unknown> = {
      expires: 1700000000000,
      email: user.email,
      role_id: 'role',
    };
    const invite = {
      get(key: string) {
        return attributes[key];
      },
      destroy: sinon.stub().resolves(),
    };
    const models = {
      Base: {
        transaction: sinon.stub().callsFake(async (callback: (tx: unknown) => Promise<void>) => {
          await callback(transacting);
        }),
      },
      Invite: { findOne: sinon.stub().resolves(invite) },
      User: { findOne: sinon.stub().resolves(null), add: sinon.stub().resolves() },
    };
    return { attributes, invite, models, repository: createAcceptanceRepository(models) };
  }

  it('keeps row locking, internal context and one transaction on the legacy model calls', async function () {
    const { repository, models, invite } = fixture();

    await repository.transaction(async (transaction) => {
      const sent = await transaction.findSentInvite('stored-token');
      assert.ok(sent);
      assert.equal(sent.email, user.email);
      assert.equal(sent.roleId, 'role');
      assert.equal(sent.expires, 1700000000000);
      assert.equal(await transaction.userExists(sent.email), false);
      await sent.consume();
      await transaction.addUser(user);
    });

    sinon.assert.calledOnceWithExactly(
      models.Invite.findOne,
      { token: 'stored-token', status: 'sent' },
      options,
    );
    sinon.assert.calledOnceWithExactly(models.User.findOne, { email: user.email }, options);
    sinon.assert.calledOnceWithExactly(invite.destroy, options);
    sinon.assert.calledOnceWithExactly(models.User.add, user, options);
    // Bookshelf static and instance methods rely on their original receiver.
    sinon.assert.calledOn(models.Base.transaction, models.Base);
    sinon.assert.calledOn(models.Invite.findOne, models.Invite);
    sinon.assert.calledOn(models.User.findOne, models.User);
    sinon.assert.calledOn(models.User.add, models.User);
    sinon.assert.calledOn(invite.destroy, invite);
  });

  it('returns null for a missing invitation and recognises an existing user', async function () {
    const { repository, models } = fixture();
    models.Invite.findOne.resolves(null);
    models.User.findOne.resolves({ id: 'existing-user' });

    await repository.transaction(async (transaction) => {
      assert.equal(await transaction.findSentInvite('missing'), null);
      assert.equal(await transaction.userExists(user.email), true);
    });
  });

  for (const { key, value } of [
    { key: 'expires', value: '1700000000000' },
    { key: 'email', value: null },
    { key: 'role_id', value: 42 },
  ]) {
    it(`rejects an invalid ${key} from the JavaScript model before any mutation`, async function () {
      const { repository, attributes, models, invite } = fixture();
      attributes[key] = value;

      await assert.rejects(
        repository.transaction(async (transaction) => {
          const sent = await transaction.findSentInvite('token');
          assert.ok(sent);
          await sent.consume();
          await transaction.addUser(user);
        }),
        ZodError,
      );
      sinon.assert.notCalled(invite.destroy);
      sinon.assert.notCalled(models.User.add);
    });
  }

  it('rejects missing methods when wiring the legacy registry', function () {
    const { models } = fixture();
    assert.throws(
      () => createAcceptanceRepository({ ...models, User: { findOne: models.User.findOne } }),
      { errorType: 'IncorrectUsageError', message: 'Missing invite model method: add' },
    );
  });

  it('waits for transaction completion and propagates commit failures', async function () {
    const { repository, models } = fixture();
    const failure = new Error('Commit failed');
    models.Base.transaction.callsFake(async (callback: (tx: unknown) => Promise<void>) => {
      await callback(transacting);
      throw failure;
    });

    await assert.rejects(
      repository.transaction(async () => {}),
      (error) => error === failure,
    );
  });
});
