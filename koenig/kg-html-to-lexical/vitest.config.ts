import {createKoenigVitestConfig} from '../vitest.shared';

// thresholds preserves the mocha suite's `c8 --check-coverage --100` gate.
export default createKoenigVitestConfig({
    thresholds: {lines: 100, functions: 100, branches: 100, statements: 100}
});
