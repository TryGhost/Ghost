// Characterization tests for the config port's isPrivacyDisabled against the
// origin oracle ghost/core/core/shared/config/helpers.ts (isPrivacyDisabled):
// inside the useTinfoil branch, a per-feature `privacy[flag] === true` opt-in
// re-enables that single feature (returns false) before the blanket true.
import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import {createConfig} from '../../src/seam/config.ts';

describe('seam config', function () {
    describe('isPrivacyDisabled', function () {
        it('returns false when no privacy config exists', function () {
            const config = createConfig({});
            assert.equal(config.isPrivacyDisabled('useStructuredData'), false);
        });

        it('returns true for a flag explicitly set to false', function () {
            const config = createConfig({privacy: {useStructuredData: false}});
            assert.equal(config.isPrivacyDisabled('useStructuredData'), true);
        });

        it('returns false for a flag not mentioned in privacy config', function () {
            const config = createConfig({privacy: {useRpcPing: false}});
            assert.equal(config.isPrivacyDisabled('useStructuredData'), false);
        });

        it('disables everything under useTinfoil', function () {
            const config = createConfig({privacy: {useTinfoil: true}});
            assert.equal(config.isPrivacyDisabled('useStructuredData'), true);
        });

        // Origin oracle shared/config/helpers.ts:61-71 — the per-feature
        // opt-in wins inside the tinfoil branch
        it('honors a per-feature `=== true` opt-in inside the tinfoil branch', function () {
            const config = createConfig({privacy: {useTinfoil: true, useStructuredData: true}});
            assert.equal(config.isPrivacyDisabled('useStructuredData'), false);
            // other features stay disabled
            assert.equal(config.isPrivacyDisabled('useUpdateCheck'), true);
        });
    });
});
