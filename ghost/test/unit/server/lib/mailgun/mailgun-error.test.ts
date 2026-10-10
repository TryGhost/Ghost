import assert from 'node:assert/strict';

import { getMailgunError } from '../../../../../core/server/lib/mailgun/mailgun-error';

describe('getMailgunError', function () {
  it('returns the original error from a Mailgun rejection', function () {
    const error = new Error('Mailgun request timed out');
    const rejection = { error, messageData: { to: 'member@example.com' } };

    assert.equal(getMailgunError(rejection), error);
  });

  it('returns native errors unchanged', function () {
    const error = new Error('Request failed');

    assert.equal(getMailgunError(error), error);
  });

  it('returns objects without an Error-valued error property unchanged', function () {
    for (const value of [
      {},
      { messageData: {} },
      { error: 'Request failed' },
      { error: null },
      { error: { message: 'Request failed' } },
    ]) {
      assert.equal(getMailgunError(value), value);
    }
  });

  it('returns non-object values unchanged', function () {
    for (const value of [null, undefined, 'Request failed', 42, true, Symbol('error'), () => {}]) {
      assert.equal(getMailgunError(value), value);
    }
  });
});
