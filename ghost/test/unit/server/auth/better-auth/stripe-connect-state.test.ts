import assert from 'node:assert/strict';
import sinon from 'sinon';
import {
  createStripeConnectState,
  STATE_TTL_MS,
} from '../../../../../core/server/auth/better-auth/stripe-connect-state';

type Row = { identifier: string; value: string; expiresAt: Date };

// Mirrors internalAdapter: find returns the latest row, expired or not
function fakeAdapter() {
  let rows: Row[] = [];
  return {
    get rows() {
      return rows;
    },
    createVerificationValue: sinon.spy(async (data: Row) => {
      rows.push(data);
      return { id: 'id', createdAt: new Date(), updatedAt: new Date(), ...data };
    }),
    deleteVerificationByIdentifier: sinon.spy(async (identifier: string) => {
      rows = rows.filter((row) => row.identifier !== identifier);
    }),
    findVerificationValue: sinon.spy(async (identifier: string) => {
      return rows.filter((row) => row.identifier === identifier).at(-1) ?? null;
    }),
    deleteMany: sinon.spy(
      async ({ where }: { model: string; where: { field: keyof Row; value: unknown }[] }) => {
        rows = rows.filter((row) => !where.every(({ field, value }) => row[field] === value));
        return 0;
      },
    ),
  };
}

describe('Better Auth Stripe Connect state', function () {
  let adapter: ReturnType<typeof fakeAdapter>;
  let state: ReturnType<typeof createStripeConnectState>;

  beforeEach(function () {
    adapter = fakeAdapter();
    state = createStripeConnectState({
      getContext: async () => ({ internalAdapter: adapter, adapter }) as any,
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  it('stores the state per user with a short expiry until cleared', async function () {
    const now = Date.now();
    const clock = sinon.useFakeTimers({ now, toFake: ['Date'] });
    try {
      await state.set('user-1', 'state-1');

      sinon.assert.calledOnceWithExactly(adapter.createVerificationValue, {
        identifier: 'stripe-connect:user-1',
        value: 'state-1',
        expiresAt: new Date(now + STATE_TTL_MS),
      });
      // Reading keeps it, so a failed save can be retried
      assert.equal(await state.get('user-1'), 'state-1');
      assert.equal(await state.get('user-1'), 'state-1');

      await state.clear('user-1', 'state-1');
      assert.equal(await state.get('user-1'), null);
    } finally {
      clock.restore();
    }
  });

  it('replaces an earlier state for the same user', async function () {
    await state.set('user-1', 'old');
    await state.set('user-1', 'new');

    assert.deepEqual(
      adapter.rows.map((row) => row.value),
      ['new'],
    );
    assert.equal(await state.get('user-1'), 'new');
  });

  it("does not return another user's state", async function () {
    await state.set('user-1', 'state-1');

    assert.equal(await state.get('user-2'), null);
    await state.clear('user-2', 'state-1');
    assert.equal(await state.get('user-1'), 'state-1');
  });

  it('clears only the state it was given, keeping a connection started meanwhile', async function () {
    await state.set('user-1', 'tab-a');
    assert.equal(await state.get('user-1'), 'tab-a');
    // Another tab starts connecting while tab A's save is in flight
    await state.set('user-1', 'tab-b');

    await state.clear('user-1', 'tab-a');
    assert.equal(await state.get('user-1'), 'tab-b');
  });

  it('returns null for an expired state', async function () {
    await state.set('user-1', 'state-1');
    adapter.rows[0].expiresAt = new Date(Date.now() - 1);

    assert.equal(await state.get('user-1'), null);
  });

  it('refuses a request without a staff user', async function () {
    await assert.rejects(state.set(undefined, 'state'), { errorType: 'NoPermissionError' });
    await assert.rejects(state.get(undefined), { errorType: 'NoPermissionError' });
    await assert.rejects(state.clear(undefined, 'state'), { errorType: 'NoPermissionError' });
    sinon.assert.notCalled(adapter.createVerificationValue);
    sinon.assert.notCalled(adapter.findVerificationValue);
    sinon.assert.notCalled(adapter.deleteVerificationByIdentifier);
    sinon.assert.notCalled(adapter.deleteMany);
  });
});
