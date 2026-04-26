/**
 * Compiles a permalink template (e.g. `/blog/:year/:slug/`) into an anchored,
 * named-group regex used to reverse a request URL back into the placeholder
 * values that produced it.
 *
 * Only the placeholders supported by `@tryghost/url-utils.replacePermalink`
 * are accepted, with one exception: `:uuid` is rejected because it is only
 * used by routers that the URL service deliberately does not back
 * (PreviewRouter, EmailRouter). Allowing it here would let a forward lookup
 * resolve a draft post via its preview path.
 */

const errors = require('@tryghost/errors');

const SLUG_PATTERN = '[^/]+';
const PLACEHOLDER_PATTERNS = {
    slug: SLUG_PATTERN,
    id: SLUG_PATTERN,
    primary_tag: SLUG_PATTERN,
    primary_author: SLUG_PATTERN,
    author: SLUG_PATTERN,
    year: '\\d{4}',
    month: '\\d{2}',
    day: '\\d{2}'
};

const PLACEHOLDER_RE = /:([a-z_]+)/g;
const REGEX_META_RE = /[\\^$.*+?()[\]{}|]/g;

/**
 * @typedef {Object} CompiledPermalink
 * @property {string} permalink original permalink template
 * @property {RegExp} regex anchored regex with one named group per placeholder
 * @property {string[]} fields placeholder names that appear in the template
 * @property {boolean} forwardLookupSafe whether the template can be reversed into a single resource (must contain :slug or :id)
 * @property {('slug'|'id'|null)} lookupField which captured group identifies the resource (null when not safe)
 */

/**
 * @param {string} permalink
 * @returns {CompiledPermalink}
 */
function compilePermalink(permalink) {
    if (!permalink.startsWith('/')) {
        throw new errors.IncorrectUsageError({
            message: `Permalink "${permalink}" must have a leading slash`
        });
    }
    if (!permalink.endsWith('/')) {
        throw new errors.IncorrectUsageError({
            message: `Permalink "${permalink}" must have a trailing slash`
        });
    }

    const fields = [];
    let cursor = 0;
    let pattern = '';

    for (const match of permalink.matchAll(PLACEHOLDER_RE)) {
        const literal = permalink.slice(cursor, match.index);
        pattern += literal.replace(REGEX_META_RE, '\\$&');

        const name = match[1];
        if (!PLACEHOLDER_PATTERNS[name]) {
            throw new errors.IncorrectUsageError({
                message: `Permalink "${permalink}" uses unsupported placeholder ":${name}"`
            });
        }
        if (fields.includes(name)) {
            throw new errors.IncorrectUsageError({
                message: `Permalink "${permalink}" repeats placeholder ":${name}"`
            });
        }
        fields.push(name);
        pattern += `(?<${name}>${PLACEHOLDER_PATTERNS[name]})`;

        cursor = match.index + match[0].length;
    }

    const trailing = permalink.slice(cursor).replace(REGEX_META_RE, '\\$&');
    pattern += trailing;

    const regex = new RegExp(`^${pattern}$`);

    let lookupField = null;
    if (fields.includes('slug')) {
        lookupField = 'slug';
    } else if (fields.includes('id')) {
        lookupField = 'id';
    }

    return {
        permalink,
        regex,
        fields,
        forwardLookupSafe: lookupField !== null,
        lookupField
    };
}

module.exports = {
    compilePermalink,
    PLACEHOLDER_PATTERNS
};
