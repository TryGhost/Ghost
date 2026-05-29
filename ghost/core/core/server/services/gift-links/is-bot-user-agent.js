// Conservative bot/crawler/scanner detection for gift-link read counting. The
// read count is a leak-detection proxy, so we want to skip automated clients
// (search crawlers, social preview unfurlers, email link scanners, CLI tools,
// headless browsers) without dropping real humans.
//
// IMPORTANT: gift links are shared mostly through social/messaging apps, and a
// large share of recipients read inside those apps' IN-APP BROWSER (a real
// human). Their UAs contain the bare brand name (e.g. "Twitter", "LinkedInApp",
// "WhatsApp"), so we must NOT match on bare brand names. The social preview
// CRAWLERS we do want to skip all carry "bot" (Twitterbot, LinkedInBot,
// Discordbot, TelegramBot, Slackbot, bingbot, Googlebot, …) or a distinct
// fetcher token (facebookexternalhit), which the patterns below target.
const BOT_UA_REGEX = new RegExp([
    'bot', 'crawl', 'spider', 'slurp', 'mediapartners',
    'facebookexternalhit', 'embedly',
    'preview', 'scanner', 'monitor', 'pingdom', 'uptime',
    'curl', 'wget', 'python-requests', 'go-http', 'libwww', 'http-client',
    'headless', 'phantom', 'puppeteer', 'playwright',
    'google(other|image|-read-aloud)', 'apis-google'
].join('|'), 'i');

/**
 * @param {string|undefined|null} userAgent
 * @returns {boolean} true if the request looks automated (and should not be counted)
 */
function isBotUserAgent(userAgent) {
    if (!userAgent || typeof userAgent !== 'string') {
        return true;
    }
    return BOT_UA_REGEX.test(userAgent);
}

module.exports = isBotUserAgent;
