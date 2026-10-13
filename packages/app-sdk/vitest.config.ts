import { createVitestConfig } from '@internal/cfg-vitest';

// The SDK runs in a page, so tests get a DOM. MessageChannel is Node's own, which jsdom
// leaves in place, so the channel under test is a real one.
export default createVitestConfig({ test: { environment: 'jsdom' } });
