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

    it('uses a 48-word lowercase list with no duplicate entries', function () {
        assert.equal(ACCESS_CODE_WORDS.length, 48);
        assert.equal(new Set(ACCESS_CODE_WORDS).size, ACCESS_CODE_WORDS.length);
        assert.ok(ACCESS_CODE_WORDS.every(word => /^[a-z]+$/.test(word)));
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
