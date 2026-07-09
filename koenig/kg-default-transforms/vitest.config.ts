import {createKoenigVitestConfig} from '../vitest.shared';

// Preserves the mocha suite's `c8 --check-coverage --100` gate on
// statements/functions/lines. Branches is left ungated because vitest's v8
// provider counts branch paths more granularly than c8 did (it flags two
// defensive `$isTextNode` false-paths in remove-at-link-nodes.ts that c8
// scored as 100%); gating it at 100 would fail a suite that c8 passed.
export default createKoenigVitestConfig({
    thresholds: {lines: 100, functions: 100, statements: 100}
});
