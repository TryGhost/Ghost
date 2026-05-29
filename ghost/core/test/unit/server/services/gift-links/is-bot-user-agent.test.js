const assert = require('node:assert/strict');
const isBotUserAgent = require('../../../../../core/server/services/gift-links/is-bot-user-agent');

describe('Unit: gift-links/isBotUserAgent', function () {
    const bots = [
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Twitterbot/1.0',
        'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
        'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
        'TelegramBot (like TwitterBot)',
        'LinkedInBot/1.0 (compatible; Mozilla/5.0; +http://www.linkedin.com)',
        'curl/8.1.2',
        'python-requests/2.31.0',
        'Mozilla/5.0 (compatible; YandexBot/3.0)',
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GoogleOther) Chrome',
        'HeadlessChrome/120.0.0.0'
    ];

    const humans = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
        // In-app browser webviews are REAL HUMANS tapping a shared link — must NOT be dropped.
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/430.0]',
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120 Mobile Safari/537.36 Instagram 300.0',
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36 WhatsApp/2.23'
    ];

    bots.forEach((ua) => {
        it(`treats as bot: ${ua.slice(0, 40)}`, function () {
            assert.equal(isBotUserAgent(ua), true);
        });
    });

    humans.forEach((ua) => {
        it(`treats as human: ${ua.slice(0, 40)}`, function () {
            assert.equal(isBotUserAgent(ua), false);
        });
    });

    it('treats a missing/empty user-agent as a bot (conservative, avoids scanner inflation)', function () {
        assert.equal(isBotUserAgent(undefined), true);
        assert.equal(isBotUserAgent(''), true);
        assert.equal(isBotUserAgent(null), true);
    });
});
