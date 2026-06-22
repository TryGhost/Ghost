import assert from 'node:assert/strict';

const isBotUserAgent = require('../../../../../core/server/services/gift-links/is-bot-user-agent') as (_ua: string | undefined | null) => boolean;

describe('Unit - gift-links/is-bot-user-agent', function () {
    it('treats a missing/empty/non-string UA as a bot (conservative)', function () {
        assert.equal(isBotUserAgent(undefined), true);
        assert.equal(isBotUserAgent(null), true);
        assert.equal(isBotUserAgent(''), true);
        assert.equal(isBotUserAgent(123 as unknown as string), true);
    });

    it('flags well-known crawlers and scanners', function () {
        assert.equal(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'), true);
        assert.equal(isBotUserAgent('facebookexternalhit/1.1'), true);
        assert.equal(isBotUserAgent('Twitterbot/1.0'), true);
        assert.equal(isBotUserAgent('curl/8.4.0'), true);
    });

    it('does NOT flag real humans, including social in-app browsers', function () {
        assert.equal(isBotUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'), false);
        assert.equal(isBotUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 [LinkedInApp]'), false);
    });

    it('does not false-positive on device UAs that merely contain "bot" as a substring', function () {
        // Regression guard for word-boundary matching: "CUBOT" is a phone brand.
        assert.equal(isBotUserAgent('Mozilla/5.0 (Linux; Android 10; CUBOT_X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36'), false);
    });
});
