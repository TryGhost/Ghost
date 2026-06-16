// Bot/crawler/scanner detection for gift-link read counting. The read count is
// a leak-detection proxy, so we want to skip automated clients (search crawlers,
// social preview unfurlers, email link scanners, AI/LLM fetchers, CLI tools,
// headless browsers) without dropping real humans.
//
// We delegate the bulk of this to the `isbot` library, whose pattern list is
// community-maintained and updated far more often than a hand-rolled regex
// could be. It also matters that gift links are shared mostly through
// social/messaging apps, where a large share of recipients read inside the
// app's IN-APP BROWSER (a real human, UA carries a bare brand name like
// "Twitter for iPhone", "[LinkedInApp]", "WhatsApp/…"). `isbot` is conservative
// about these and does NOT flag them — verified against our test corpus — so we
// get crawler coverage without false-positives on real readers.
//
// One deliberate deviation from raw `isbot`: a missing/empty UA → bot.
// `isbot('')`/`isbot(undefined)` return false, but a request with no UA is
// almost always an automated client or scanner, and counting it would inflate
// the proxy. We treat it as a bot (conservative).

// `isbot` ships a dual CJS/ESM build; the `require` export resolves to its
// CommonJS entry, matching this module's runtime shape. Loaded via require() to
// match the surrounding gift-links modules (which use `module.exports =`).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {isbot} = require('isbot') as {isbot: (userAgent?: string | null) => boolean};

/**
 * @param {string|undefined|null} userAgent
 * @returns {boolean} true if the request looks automated (and should not be counted)
 */
function isBotUserAgent(userAgent: string | undefined | null): boolean {
    if (!userAgent || typeof userAgent !== 'string') {
        return true;
    }
    return isbot(userAgent);
}

// module.exports required - using `export` causes the module to fail to register
// when loaded via require()
module.exports = isBotUserAgent;
