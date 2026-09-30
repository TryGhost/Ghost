import assert from 'node:assert/strict';
import {assertExists} from '../../../utils/assertions';
// @ts-expect-error This module lacks type definitions.
import internalKeys from '../../../../core/server/services/internal-keys';

// Stuff we are testing
// @ts-expect-error This module lacks type definitions.
import content_api_key from '../../../../core/frontend/helpers/content_api_key';

describe('{{content_api_key}} helper', function () {
  beforeEach(function () {
    internalKeys.clear();
    internalKeys.set('ghost-internal-frontend', Promise.resolve({id: 'k', secret: 'xyz'}));
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
