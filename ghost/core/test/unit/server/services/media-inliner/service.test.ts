import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, afterEach } from 'vitest';

// require() so the singletons are the same instances the service under test uses
const mediaInlinerService = require('../../../../../core/server/services/media-inliner');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;

describe('media-inliner service', function () {
  // init() mutates the process-wide service singleton, and the unit project runs
  // with isolate:false — put it back or it leaks into the next file.
  const original = { inliner: mediaInlinerService.inliner, api: mediaInlinerService.api };

  afterEach(function () {
    mediaInlinerService.inliner = original.inliner;
    mediaInlinerService.api = original.api;
    sinon.restore();
  });

  it('exposes the configured inliner after init', async function () {
    sinon.stub(adapterManager, 'getAdapter').returns({});

    await mediaInlinerService.init();

    assert.equal(typeof mediaInlinerService.inliner.inline, 'function');
  });
});
