import {createKoenigVitestConfig} from '../vitest.shared';

// thresholds preserves the mocha suite's `c8 --check-coverage` gate (lines >= 90%).
export default createKoenigVitestConfig({
    setupFiles: ['./test/test-utils/overrides.ts', './test/test-utils/assertions.ts'],
    thresholds: {lines: 90}
});
