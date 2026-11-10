import assert from 'node:assert/strict';

import { getMailgunError } from '../../../../../core/server/lib/mailgun/mailgun-error';

describe('getMailgunError', function () {
  it('adds Mailgun context and preserves the original stack without the email payload', function () {
    const error = new Error('Forbidden');
    const rejection = { error, messageData: { to: 'member@example.com' } };

    const result = getMailgunError(rejection) as Error;

    assert.equal(result.message, 'Mailgun error: Forbidden');
    for (const frame of error.stack!.split('\n').slice(1)) {
      assert.ok(result.stack?.includes(frame));
    }
    assert.equal('messageData' in result, false);
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
