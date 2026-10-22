import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import { accept } from '../../../../../core/server/services/invites/accept';
import type {
  AcceptanceRepository,
  AcceptanceTransaction,
  SentInvite,
} from '../../../../../core/server/services/invites/acceptance-repository';

describe('Unit: services/invites/accept', function () {
  const now = 1700000000000;
  let repository: AcceptanceRepository;
  let transaction: AcceptanceTransaction;
  let transactionStub: sinon.SinonStub;
  let findSentInviteStub: sinon.SinonStub;
  let userExistsStub: sinon.SinonStub;
  let consumeStub: sinon.SinonStub;
  let addUserStub: sinon.SinonStub;
  let invite: SentInvite;
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
    consumeStub = sinon.stub().resolves();
    invite = {
      expires: now + 100000,
      email: 'stored@example.com',
      roleId: 'stored-role',
      consume: consumeStub,
    };
    findSentInviteStub = sinon.stub().resolves(invite);
    userExistsStub = sinon.stub().resolves(false);
    addUserStub = sinon.stub().resolves();
    transaction = {
      findSentInvite: findSentInviteStub,
      userExists: userExistsStub,
      addUser: addUserStub,
    };
    transactionStub = sinon
      .stub()
      .callsFake(async (callback: (tx: AcceptanceTransaction) => Promise<void>) =>
        callback(transaction),
      );
    repository = { transaction: transactionStub };
  });

  afterEach(function () {
    sinon.restore();
  });

  it('runs inside a transaction', async function () {
    await accept(invitation, repository);

    sinon.assert.calledOnce(transactionStub);
  });

  it('destroys invite before creating user', async function () {
    const callOrder: string[] = [];
    consumeStub.callsFake(async () => {
      callOrder.push('destroy');
    });
    addUserStub.callsFake(async () => {
      callOrder.push('addUser');
    });

    await accept(invitation, repository);

    assert.deepEqual(callOrder, ['destroy', 'addUser']);
  });

  it('looks up only sent invitations using the decoded URL-safe token', async function () {
    await accept(invitation, repository);

    sinon.assert.calledOnceWithExactly(findSentInviteStub, 'a+b/cA==');
  });

  it('takes email and role from the stored invite and name and password from the request', async function () {
    await accept(invitation, repository);

    sinon.assert.calledOnceWithExactly(userExistsStub, 'stored@example.com');
    sinon.assert.calledOnceWithExactly(addUserStub, {
      email: 'stored@example.com',
      roles: ['stored-role'],
      name: 'Test User',
      password: 'password123',
    });
  });

  it('rejects a missing sent invite without looking up or creating a user', async function () {
    findSentInviteStub.resolves(null);

    await assert.rejects(accept(invitation, repository), {
      errorType: 'NotFoundError',
      message: 'Invite not found.',
    });

    sinon.assert.notCalled(userExistsStub);
    sinon.assert.notCalled(consumeStub);
    sinon.assert.notCalled(addUserStub);
  });

  it('rejects an invite expired by one millisecond without consuming it', async function () {
    invite.expires = now - 1;

    await assert.rejects(accept(invitation, repository), {
      errorType: 'NotFoundError',
      message: 'Invite is expired.',
    });

    sinon.assert.notCalled(userExistsStub);
    sinon.assert.notCalled(consumeStub);
    sinon.assert.notCalled(addUserStub);
  });

  it('accepts an invite at the exact expiry boundary', async function () {
    invite.expires = now;

    await accept(invitation, repository);

    sinon.assert.calledOnce(consumeStub);
    sinon.assert.calledOnce(addUserStub);
  });

  it('rejects an existing stored email without consuming the invite or creating a user', async function () {
    userExistsStub.resolves(true);

    await assert.rejects(accept(invitation, repository), {
      errorType: 'ValidationError',
      message: 'Could not create an account, email is already in use.',
      context: 'Attempting to create an account with existing email address.',
      help: 'Use different email address to register your account.',
    });

    sinon.assert.notCalled(consumeStub);
    sinon.assert.notCalled(addUserStub);
  });

  it('waits for invite deletion to finish before creating the user', async function () {
    const deletion = Promise.withResolvers<void>();
    const started = Promise.withResolvers<void>();
    consumeStub.callsFake(() => {
      started.resolve();
      return deletion.promise;
    });
    const result = accept(invitation, repository);

    try {
      await Promise.race([started.promise, result]);
      await setImmediate();
      sinon.assert.calledOnce(consumeStub);
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
    const result = accept(invitation, repository).finally(() => {
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
      const steps = [findSentInviteStub, userExistsStub, consumeStub, addUserStub];
      const index = ['invite lookup', 'user lookup', 'invite deletion', 'user creation'].indexOf(
        stage,
      );
      const failure = new Error(`${stage} failed`);
      steps[index].rejects(failure);

      await assert.rejects(accept(invitation, repository), (error) => error === failure);

      sinon.assert.calledOnce(steps[index]);
      for (const later of steps.slice(index + 1)) {
        sinon.assert.notCalled(later);
      }
    });
  }

  it('propagates transaction startup failure without querying the repository', async function () {
    const failure = new Error('Transaction unavailable');
    transactionStub.rejects(failure);

    await assert.rejects(accept(invitation, repository), (error) => error === failure);

    sinon.assert.notCalled(findSentInviteStub);
    sinon.assert.notCalled(userExistsStub);
    sinon.assert.notCalled(consumeStub);
    sinon.assert.notCalled(addUserStub);
  });

  it('propagates transaction failure after the callback has completed', async function () {
    const failure = new Error('Transaction completion failed');
    transactionStub.callsFake(async (callback: (tx: AcceptanceTransaction) => Promise<void>) => {
      await callback(transaction);
      throw failure;
    });

    await assert.rejects(accept(invitation, repository), (error) => error === failure);

    sinon.assert.calledOnce(addUserStub);
  });
});
