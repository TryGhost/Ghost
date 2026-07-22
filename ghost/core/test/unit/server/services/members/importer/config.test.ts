import assert from 'node:assert/strict';
import {resolveInlineThreshold} from '../../../../../../core/server/services/members/importer/config';

// The value shipped in defaults.json. Read rather than restated so this suite
// follows the shipped threshold if it is ever changed.
const shipped: number = require('../../../../../../core/shared/config/defaults.json')
    .members.importer.inlineThreshold;

describe('resolveInlineThreshold', function () {
    it('uses the shipped threshold when nothing is configured', function () {
        assert.equal(resolveInlineThreshold(undefined), shipped);
    });

    it('takes a configured number', function () {
        assert.equal(resolveInlineThreshold(250), 250);
    });

    it('takes a number supplied as a string, as an environment variable would', function () {
        assert.equal(resolveInlineThreshold('250'), 250);
    });

    it('takes zero, which defers every import', function () {
        assert.equal(resolveInlineThreshold(0), 0);
    });

    // An operator can correct a bad value live, so an unusable one falls back to
    // the shipped threshold rather than throwing and taking member import down
    // with it, and rather than being read as "no threshold".
    for (const unusable of [-1, 1.5, 'five hundred', '', null, true, NaN, Infinity, [], {}]) {
        it(`falls back to the shipped threshold for ${JSON.stringify(unusable) ?? String(unusable)}`, function () {
            assert.equal(resolveInlineThreshold(unusable), shipped);
        });
    }
});
