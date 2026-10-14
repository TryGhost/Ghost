import assert from 'node:assert/strict';
import sinon from 'sinon';
import { generate, verify } from '../../../../../core/server/services/auth/totp';

describe('TOTP service', function () {
  let clock: sinon.SinonFakeTimers;

  beforeEach(function () {
    clock = sinon.useFakeTimers(new Date('2026-01-01T12:00:00.000Z'));
  });

  afterEach(function () {
    sinon.restore();
  });

  it('generates a six-digit token that verifies for same user and secret', function () {
    const token = generate('user-1', 'admin-session-secret');

    assert.match(token, /^\d{6}$/);
    assert.equal(verify('user-1', token, 'admin-session-secret'), true);
  });

  it('binds tokens to user, secret, and session context', function () {
    const token = generate('user-1', 'admin-session-secret', 'session-1');

    assert.equal(verify('user-2', token, 'admin-session-secret', 'session-1'), false);
    assert.equal(verify('user-1', token, 'other-session-secret', 'session-1'), false);
    assert.equal(verify('user-1', token, 'admin-session-secret', 'session-2'), false);
  });

  it('accepts tokens for configured ten-minute window', function () {
    const token = generate('user-1', 'admin-session-secret');

    clock.tick(10 * 60 * 1000);
    assert.equal(verify('user-1', token, 'admin-session-secret'), true);

    clock.tick(60 * 1000);
    assert.equal(verify('user-1', token, 'admin-session-secret'), false);
  });
});
