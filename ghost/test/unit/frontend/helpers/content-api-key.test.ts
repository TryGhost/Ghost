import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { assertExists } from '../../../utils/assertions';
import type { InternalKeys } from '../../../../core/server/services/internal-keys';

const localRequire = createRequire(__filename);
const internalKeys: InternalKeys = localRequire(
  '../../../../core/server/services/internal-keys',
).default;

// Stuff we are testing
// @ts-expect-error This module lacks type definitions.
import content_api_key from '../../../../core/frontend/helpers/content_api_key';

describe('{{content_api_key}} helper', function () {
  beforeEach(function () {
    internalKeys.clear();
    internalKeys.set('ghost-internal-frontend', Promise.resolve({ id: 'k', secret: 'xyz' }));
  });

  afterEach(function () {
    internalKeys.clear();
  });

  it('returns the content API key', async function () {
    const result = await content_api_key();
    assertExists(result);
    assert.equal(String(result), 'xyz');
  });
});
