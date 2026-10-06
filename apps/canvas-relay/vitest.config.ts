import { createVitestConfig } from '@internal/cfg-vitest';

export default createVitestConfig({ test: { testTimeout: 15000, hookTimeout: 30000 } });
