import { createVitestConfig } from '@internal/cfg-vitest';

// The SDK runs in a page, so tests get a DOM. MessageChannel is Node's own, which jsdom
// leaves in place, so the channel under test is a real one. The package and the browser
// bundle are built first, for the tests that check what they import.
export default createVitestConfig({
  test: { environment: 'jsdom', globalSetup: ['test/build.ts'] },
});
