const assert = require('node:assert/strict');
const {ACCESS_CODE_WORDS, generatePrivateSiteAccessCode} = require('../../../../../core/server/services/settings/private-site-access-code');

describe('UNIT > private-site-access-code', function () {
    it('returns a curated word with a three-digit suffix', function () {
        for (let i = 0; i < 50; i++) {
            const code = generatePrivateSiteAccessCode();
            assert.match(code, /^[a-z]+\d{3}$/);

            const word = code.replace(/\d{3}$/, '');
            assert.ok(ACCESS_CODE_WORDS.includes(word), `expected ${word} to be in the curated word list`);
        }
    });

    it('uses the Product-approved 48-word list', function () {
        assert.deepEqual(ACCESS_CODE_WORDS, [
            'anchor', 'aurora', 'beacon', 'birch', 'bright', 'cedar', 'cloud', 'comet', 'copper', 'coral',
            'ember', 'fern', 'field', 'forest', 'golden', 'green', 'harbor', 'hidden', 'horizon', 'juniper',
            'lagoon', 'lunar', 'maple', 'meadow', 'midnight', 'north', 'ocean', 'olive', 'paper', 'pine',
            'quiet', 'river', 'sage', 'signal', 'silver', 'solstice', 'sparrow', 'stone', 'studio', 'summit',
            'sunrise', 'thistle', 'valley', 'violet', 'willow', 'window', 'winter', 'wild'
        ]);
    });

    it('produces varied codes across consecutive calls', function () {
        const codes = new Set();
        for (let i = 0; i < 50; i++) {
            codes.add(generatePrivateSiteAccessCode());
        }
        // Just ensure the output isn't constant — 50 draws from a 48,000-value
        // space has a non-trivial birthday-collision rate, so any tighter
        // threshold would be flaky.
        assert.ok(codes.size > 1, `expected varied codes, got ${codes.size} distinct value(s)`);
    });
});
