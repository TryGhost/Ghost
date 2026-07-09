import {createKoenigVitestConfig} from '../vitest.shared';

// thresholds preserves the mocha suite's `c8 --check-coverage` gate (lines >= 90%).
export default createKoenigVitestConfig({
    thresholds: {lines: 90}
});
