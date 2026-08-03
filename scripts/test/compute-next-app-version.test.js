import {describe, it} from 'node:test';
import assert from 'node:assert';

import {computeNextVersion} from '../compute-next-app-version.js';

describe('computeNextVersion', () => {
    it('takes the next patch above the highest published in the line', () => {
        assert.strictEqual(computeNextVersion('1.8', ['1.8.0', '1.8.9', '1.8.10']), '1.8.11');
    });

    it('starts a fresh line at .0', () => {
        assert.strictEqual(computeNextVersion('1.9', ['1.8.230', '2.0.1']), '1.9.0');
        assert.strictEqual(computeNextVersion('1.9', []), '1.9.0');
    });

    it('ignores other lines', () => {
        assert.strictEqual(computeNextVersion('1.8', ['1.7.99', '1.8.3', '1.9.50', '2.8.7']), '1.8.4');
    });

    it('ignores prereleases in the line', () => {
        assert.strictEqual(computeNextVersion('2.69', ['2.69.4', '2.69.5-beta.1']), '2.69.5');
    });

    it('ignores versions npm reports that are not semver', () => {
        assert.strictEqual(computeNextVersion('1.8', ['garbage', '1.8.2']), '1.8.3');
    });

    it('rejects a malformed version line', () => {
        assert.throws(() => computeNextVersion('1.8.0', []), /Invalid major\.minor version line/);
    });
});
