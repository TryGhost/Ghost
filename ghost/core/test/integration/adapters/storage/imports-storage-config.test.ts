import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { Provider } from 'nconf';
import { bindAll as bindUrlHelpers } from '@tryghost/config-url-helpers';

import { normalizeAdapterConfig } from '../../../../core/server/services/adapter-manager/utils';
import { bindAll as bindHelpers } from '../../../../core/shared/config/helpers';
import type { ConfigInstance } from '../../../../core/shared/config/loader';

// A booted Ghost always has storage config and never configures imports, so the
// cases where the default is not applied never run in an end-to-end suite.
describe('Integration: storage:imports default', function () {
  const loadNconf = (storage?: object): ConfigInstance => {
    const nconf = new Provider();
    nconf.use('memory');
    nconf.set('paths:contentPath', '/some/path');
    if (storage) {
      nconf.set('storage', storage);
    }

    bindUrlHelpers(nconf);
    bindHelpers(nconf);

    return nconf as unknown as ConfigInstance;
  };

  it('leaves a configured imports store alone', function () {
    const storage = {
      active: 'LocalImagesStorage',
      imports: 'S3Storage',
      S3Storage: { bucket: 'b' },
    };

    assert.deepEqual(normalizeAdapterConfig(loadNconf(storage)).storage, storage);
  });

  it('adds nothing when there is no storage config at all', function () {
    assert.equal(normalizeAdapterConfig(loadNconf()).storage, undefined);
  });
});
