import { createVitestConfig } from '@internal/cfg-vitest';

import { sdkVersion } from './version.config.ts';

// The SDK runs in a page, so tests get a DOM. MessageChannel is Node's own, which jsdom
// leaves in place, so the channel under test is a real one. The package and the browser
// bundle are built first, for the tests that check what they import.
export default createVitestConfig({
  define: sdkVersion,
  test: { environment: 'jsdom', globalSetup: ['test/build.ts'] },
});
