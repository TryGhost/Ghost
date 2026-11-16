import assert from 'node:assert/strict';
import { URL_MAX_LENGTH } from '@tryghost/app-contracts';
import schema from '../../../../../core/server/data/schema/schema';

describe('app installation tables', function () {
  // The contract is what refuses a longer manifest URL; the service has no check of its
  // own. So the column must be at least as wide, or an accepted URL fails at the insert.
  it('store a manifest URL as long as the contract allows', function () {
    assert.equal(schema.app_installation_manifests.manifest_url.maxlength, URL_MAX_LENGTH);
  });
});
