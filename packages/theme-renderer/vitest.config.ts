import {createVitestConfig} from '@internal/cfg-vitest';
import {configDefaults} from 'vitest/config';

// Thresholds are tuned down from the internal-package default (100/100/80/100):
// most of src/ is near-verbatim code copied from ghost/core/core/frontend
// (see docs/provenance.md) covered by characterization tests, not exhaustive
// unit tests — full branch coverage of copied bodies isn't a goal of the
// extraction (parity slicing is, see template-renderer-spec).
export default createVitestConfig({
    test: {
        // The browser-mode worker-parity suite runs in Chromium via
        // vitest.browser.config.ts (pnpm browser:test) — its tests use Worker
        // and would fail under the Node runtime. Extend (not replace) the
        // default excludes so node_modules etc. stay excluded.
        exclude: [...configDefaults.exclude, 'test/browser/**'],
        coverage: {
            thresholds: {
                lines: 70,
                functions: 75,
                branches: 55,
                statements: 70
            }
        }
    }
});
