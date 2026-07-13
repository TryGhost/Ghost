// Matches a scheme-less value whose first path segment looks like a hostname,
// e.g. `www.example.com/path` or `example.co.uk/#/share`. Deliberately narrow:
// the first segment must contain a dot and be a valid hostname before the first
// `/`, `?`, or `#`, so genuine relative paths like `about/team` are not matched.
const DOMAIN_LIKE_RE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:[/?#]|$)/i;

/**
 * Ensure a URL-type card property (e.g. a button's `buttonUrl`) has an explicit
 * scheme so downstream URL handling treats it as absolute rather than relative.
 *
 * Without this, a value like `www.example.com/post/#/share` is neither cleanly
 * absolute nor cleanly relative: it is stored verbatim (transform-ready skips it)
 * and later resolved against the post URL when rendering emails, producing a
 * doubled URL such as `https://example.com/post/www.example.com/post/#/share`.
 *
 * Leaves untouched: already-scheme'd URLs (http:, https:, mailto:, tel:, …),
 * protocol-relative URLs (`//cdn…`), and genuine relative links (`#…`, `/…`,
 * `about/team`).
 *
 * @param {string} value
 * @returns {string}
 */
function ensureUrlScheme(value) {
    if (typeof value !== 'string' || value === '') {
        return value;
    }

    // Already has a scheme (http:, https:, mailto:, tel:, …) or is protocol-relative
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')) {
        return value;
    }

    // Explicit relative links
    if (value.startsWith('#') || value.startsWith('/')) {
        return value;
    }

    // Looks like a bare domain the user forgot to prefix with a scheme
    if (DOMAIN_LIKE_RE.test(value)) {
        return `https://${value}`;
    }

    return value;
}

module.exports = ensureUrlScheme;
