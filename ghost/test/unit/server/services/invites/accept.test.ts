import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import { accept, type AcceptanceModels } from '../../../../../core/server/services/invites/accept';

describe('Unit: services/invites/accept', function () {
  const now = 1700000000000;
  const transacting = { id: 'fake-txn' };
  let models: AcceptanceModels<typeof transacting>;
  let transactionStub: sinon.SinonStub;
  let findOneInviteStub: sinon.SinonStub;
  let findOneUserStub: sinon.SinonStub;
  let destroyStub: sinon.SinonStub;
  let addUserStub: sinon.SinonStub;
  let inviteAttributes: { expires: number; email: string; role_id: string };
  let invitation: {
    invitation: Array<{
      token: string;
      email: string;
      role_id: string;
      name: string;
      password: string;
    }>;
  };

  beforeEach(function () {
    sinon.stub(Date, 'now').returns(now);
    invitation = {
      invitation: [
        {
          token: 'a-b_cA',
          email: 'request@example.com',
          role_id: 'request-role',
          name: 'Test User',
          password: 'password123',
        },
      ],
    };
    inviteAttributes = {
      expires: now + 100000,
      email: 'stored@example.com',
      role_id: 'stored-role',
    };
    destroyStub = sinon.stub().resolves();
    findOneInviteStub = sinon.stub().resolves({
      get: <Key extends keyof typeof inviteAttributes>(key: Key) => inviteAttributes[key],
      destroy: destroyStub,
    });
    findOneUserStub = sinon.stub().resolves(null);
    addUserStub = sinon.stub().resolves();
    // This fixture drives transaction propagation; it does not simulate database rollback.
    transactionStub = sinon
      .stub()
      .callsFake(async (cb: (transaction: typeof transacting) => Promise<void>) => cb(transacting));

    models = {
      Base: { transaction: transactionStub },
      Invite: { findOne: findOneInviteStub },
      User: { findOne: findOneUserStub, addWithRoles: addUserStub },
    };
  });

  afterEach(function () {
    sinon.restore();
  });

  it('runs inside a transaction', async function () {
    await accept(invitation, models);

    sinon.assert.calledOnce(transactionStub);
  });

  it('passes internal context, the same transaction and row locking to all model calls', async function () {
    await accept(invitation, models);

    const options = [
      findOneInviteStub.secondCall.args[1],
      findOneUserStub.firstCall.args[1],
      destroyStub.firstCall.args[0],
      addUserStub.firstCall.args[1],
    ];
    for (const value of options) {
      assert.equal(value.transacting, transacting);
      assert.deepEqual(value, { context: { internal: true }, transacting, forUpdate: true });
    }
  });

  it('destroys invite before creating user', async function () {
    const callOrder: string[] = [];
    destroyStub.callsFake(async () => {
      callOrder.push('destroy');
    });
    addUserStub.callsFake(async () => {
      callOrder.push('addUser');
    });

    await accept(invitation, models);

    assert.deepEqual(callOrder, ['destroy', 'addUser']);
  });

  it('looks up only sent invitations using the decoded URL-safe token', async function () {
    await accept(invitation, models);

    sinon.assert.calledWithExactly(
      findOneInviteStub.secondCall,
      { token: 'a+b/cA==', status: 'sent' },
      {
        context: { internal: true },
        transacting,
        forUpdate: true,
      },
    );
  });

  it('takes email and role from the stored invite and name and password from the request', async function () {
    await accept(invitation, models);

    sinon.assert.calledOnceWithExactly(
      findOneUserStub,
      { email: 'stored@example.com' },
      {
        context: { internal: true },
        transacting,
        forUpdate: true,
      },
    );
    sinon.assert.calledOnceWithExactly(
      addUserStub,
      {
        email: 'stored@example.com',
        roles: ['stored-role'],
        name: 'Test User',
        password: 'password123',
      },
      {
        context: { internal: true },
        transacting,
        forUpdate: true,
      },
    );
  });

  it('rejects a missing sent invite without looking up or creating a user', async function () {
    findOneInviteStub.resolves(null);

    await assert.rejects(accept(invitation, models), {
      errorType: 'NotFoundError',
      message: 'Invite not found.',
    });

    sinon.assert.notCalled(findOneUserStub);
    sinon.assert.notCalled(destroyStub);
    sinon.assert.notCalled(addUserStub);
  });

  it('rejects an invite expired by one millisecond without consuming it', async function () {
    inviteAttributes.expires = now - 1;

    await assert.rejects(accept(invitation, models), {
      errorType: 'NotFoundError',
      message: 'Invite is expired.',
    });

    sinon.assert.notCalled(findOneUserStub);
    sinon.assert.notCalled(destroyStub);
    sinon.assert.notCalled(addUserStub);
  });

  for (const expired of [false, true]) {
    it(`rejects ${expired ? 'expired' : 'unknown'} tokens before opening a transaction or taking the shared lock`, async function () {
      const lockStaffUsage = sinon.stub().resolves();
      if (expired) {
        inviteAttributes.expires = now - 1;
      } else {
        findOneInviteStub.resolves(null);
      }
      await assert.rejects(accept(invitation, models, lockStaffUsage), {
        errorType: 'NotFoundError',
      });
      sinon.assert.notCalled(transactionStub);
      sinon.assert.notCalled(lockStaffUsage);
    });
  }

  it('rechecks the token after taking the shared lock', async function () {
    findOneInviteStub.onSecondCall().resolves(null);
    const lockStaffUsage = sinon.stub().resolves();
    await assert.rejects(accept(invitation, models, lockStaffUsage), {
      message: 'Invite not found.',
    });
    sinon.assert.calledOnceWithExactly(lockStaffUsage, transacting);
    sinon.assert.callOrder(findOneInviteStub, lockStaffUsage);
    assert.ok(lockStaffUsage.firstCall.calledBefore(findOneInviteStub.secondCall));
    sinon.assert.notCalled(destroyStub);
    sinon.assert.notCalled(addUserStub);
  });

  it('rechecks expiry after waiting for the shared lock', async function () {
    const lockStaffUsage = sinon.stub().callsFake(async () => {
      inviteAttributes.expires = now - 1;
    });
    await assert.rejects(accept(invitation, models, lockStaffUsage), {
      message: 'Invite is expired.',
    });
    sinon.assert.notCalled(destroyStub);
    sinon.assert.notCalled(addUserStub);
  });

  it('accepts an invite at the exact expiry boundary', async function () {
    inviteAttributes.expires = now;

    await accept(invitation, models);

    sinon.assert.calledOnce(destroyStub);
    sinon.assert.calledOnce(addUserStub);
  });

  it('rejects an existing stored email without consuming the invite or creating a user', async function () {
    findOneUserStub.resolves({ id: 'existing-user' });

    await assert.rejects(accept(invitation, models), {
      errorType: 'ValidationError',
      message: 'Could not create an account, email is already in use.',
      context: 'Attempting to create an account with existing email address.',
      help: 'Use different email address to register your account.',
    });

    sinon.assert.notCalled(destroyStub);
    sinon.assert.notCalled(addUserStub);
  });

  it('waits for invite deletion to finish before creating the user', async function () {
    const deletion = Promise.withResolvers<void>();
    const started = Promise.withResolvers<void>();
    destroyStub.callsFake(() => {
      started.resolve();
      return deletion.promise;
    });
    const result = accept(invitation, models);

    try {
      await Promise.race([started.promise, result]);
      await setImmediate();
      sinon.assert.calledOnce(destroyStub);
      sinon.assert.notCalled(addUserStub);
    } finally {
      deletion.resolve();
      await Promise.allSettled([result]);
    }

    await result;
    sinon.assert.calledOnce(addUserStub);
  });

  it('waits for user creation before resolving acceptance', async function () {
    const creation = Promise.withResolvers<{ id: string }>();
    const started = Promise.withResolvers<void>();
    let settled = false;
    addUserStub.callsFake(() => {
      started.resolve();
      return creation.promise;
    });
    const result = accept(invitation, models).finally(() => {
      settled = true;
    });

    try {
      await Promise.race([started.promise, result]);
      await setImmediate();
      sinon.assert.calledOnce(addUserStub);
      assert.equal(settled, false);
    } finally {
      creation.resolve({ id: 'created-user' });
      await Promise.allSettled([result]);
    }

    assert.equal(await result, undefined);
  });

  for (const stage of ['invite lookup', 'user lookup', 'invite deletion', 'user creation']) {
    it(`propagates the original ${stage} failure and stops subsequent steps`, async function () {
      const steps = [findOneInviteStub, findOneUserStub, destroyStub, addUserStub];
      const index = ['invite lookup', 'user lookup', 'invite deletion', 'user creation'].indexOf(
        stage,
      );
      const failure = new Error(`${stage} failed`);
      steps[index].rejects(failure);

      await assert.rejects(accept(invitation, models), (error) => error === failure);

      sinon.assert.calledOnce(steps[index]);
      for (const later of steps.slice(index + 1)) {
        sinon.assert.notCalled(later);
      }
    });
  }

  it('propagates transaction startup failure after the preliminary lookup', async function () {
    const failure = new Error('Transaction unavailable');
    transactionStub.rejects(failure);

    await assert.rejects(accept(invitation, models), (error) => error === failure);

    sinon.assert.calledOnce(findOneInviteStub);
    sinon.assert.notCalled(findOneUserStub);
    sinon.assert.notCalled(destroyStub);
    sinon.assert.notCalled(addUserStub);
  });

  it('propagates transaction failure after the callback has completed', async function () {
    const failure = new Error('Transaction completion failed');
    transactionStub.callsFake(
      async (callback: (transaction: typeof transacting) => Promise<void>) => {
        await callback(transacting);
        throw failure;
      },
    );

    await assert.rejects(accept(invitation, models), (error) => error === failure);

    sinon.assert.calledOnce(addUserStub);
  });
});
