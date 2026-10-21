import assert from 'node:assert/strict';
import { describeWebhookError } from '../../../../core/server/lib/signed-webhook';

describe('describeWebhookError', function () {
  it('describes an HTTP failure by its status code, not its message', function () {
    const error = Object.assign(
      new Error(
        'Request failed with status code 500 (Internal Server Error): POST https://hooks.example.com/secret-path?token=abc',
      ),
      { code: 'ERR_NON_2XX_3XX_RESPONSE', response: { statusCode: 500 } },
    );

    assert.equal(describeWebhookError(error), 'HTTP 500');
  });

  it('describes a failure without a response by its error code', function () {
    const error = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:443'), {
      code: 'ECONNREFUSED',
    });

    assert.equal(describeWebhookError(error), 'ECONNREFUSED');
  });

  it('falls back to a generic description', function () {
    assert.equal(
      describeWebhookError(new Error('https://hooks.example.com/secret')),
      'unknown error',
    );
    assert.equal(describeWebhookError('https://hooks.example.com/secret'), 'unknown error');
    assert.equal(describeWebhookError(null), 'unknown error');
  });
});
