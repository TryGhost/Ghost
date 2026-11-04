import { createVitestConfig } from '@internal/cfg-vitest';

import { sdkVersion } from './version.config.ts';

// The SDK runs in a page, so tests get a DOM; the backend's and tooling's tests run
// in Node. MessageChannel is Node's own, which jsdom leaves in place, so the channel under test
// is a real one. The package and the browser bundle are built first, for the tests that check
// what they import. The CLI's bin only calls `run`, which the tests call directly; the package
// tests run the bin from the packed package, where coverage can't follow.
export default createVitestConfig({
  define: sdkVersion,
  test: {
    environment: 'jsdom',
    globalSetup: ['test/build.ts'],
    coverage: { exclude: ['src/bin.ts'] },
  },
});
