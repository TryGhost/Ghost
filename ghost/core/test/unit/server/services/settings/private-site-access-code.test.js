const assert = require('node:assert/strict');
const {generatePrivateSiteAccessCode} = require('../../../../../core/server/services/settings/private-site-access-code');

describe('UNIT > private-site-access-code', function () {
    it('returns a placeholder string matching the fake-### format', function () {
        for (let i = 0; i < 50; i++) {
            const code = generatePrivateSiteAccessCode();
            assert.match(code, /^fake-\d{3}$/);
        }
    });

    it('produces varied codes across consecutive calls', function () {
        const codes = new Set();
        for (let i = 0; i < 50; i++) {
            codes.add(generatePrivateSiteAccessCode());
        }
        // Just ensure the output isn't constant — 50 draws from a 1,000-value
        // space has a non-trivial birthday-collision rate, so any tighter
        // threshold would be flaky.
        assert.ok(codes.size > 1, `expected varied codes, got ${codes.size} distinct value(s)`);
    });
});
