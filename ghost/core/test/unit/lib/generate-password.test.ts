import assert from 'node:assert/strict';
import * as sinon from 'sinon';
// @ts-expect-error This module lacks type definitions.
import * as security from '@tryghost/security';
import { generatePassword } from '../../../core/server/lib/generate-password';

describe('password generation', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('returns a 50-character password', function () {
    const result = generatePassword('user@example.com');

    assert.equal(result.length, 50);
    assert.match(result, /^[a-zA-Z0-9]+$/);
  });

  it('retries invalid generated passwords', function () {
    const uid = sinon
      .stub(security.identifier, 'uid')
      .onFirstCall()
      .returns('password')
      .onSecondCall()
      .returns('TY7VZkRwCcUKhJP9');

    assert.equal(generatePassword('user@example.com'), 'TY7VZkRwCcUKhJP9');
    sinon.assert.callCount(uid, 2);
  });
});
