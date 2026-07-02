const DEFAULT_PAGE_PARAM = 'page';

// Segments that already carry routing meaning and must not be reused as the
// pagination segment.
const RESERVED_SEGMENTS = ['tag', 'author', 'rss', 'amp', 'private', 'edit', 'unsubscribe'];

const INVALID_CHARACTERS = /[/?#:\s]/;

let currentPageParam = DEFAULT_PAGE_PARAM;

/**
 * @description Validates a candidate pagination segment, falling back to "page".
 * @param {*} value
 * @returns {string}
 */
function validatePageParam(value) {
    if (typeof value !== 'string') {
        return DEFAULT_PAGE_PARAM;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
        return DEFAULT_PAGE_PARAM;
    }

    if (INVALID_CHARACTERS.test(trimmed)) {
        return DEFAULT_PAGE_PARAM;
    }

    if (RESERVED_SEGMENTS.includes(trimmed.toLowerCase())) {
        return DEFAULT_PAGE_PARAM;
    }

    return trimmed;
}

/**
 * @description Returns the active pagination URL segment (e.g. "page").
 *
 * The value originates from the top-level `pagination` key in routes.yaml and is
 * pushed in via {@link setPageParam} when the routers are (re)built. It is a
 * site-wide global because the non-routing consumers (paginated-url, context,
 * templates, page-param middleware) have no routing context to derive it from.
 *
 * @returns {string}
 */
function getPageParam() {
    return currentPageParam;
}

/**
 * @description Sets the active pagination segment from the loaded route settings.
 *
 * Called by the router manager on (re)build so a routes.yaml change takes effect
 * without a restart. The value is validated against unsafe characters and
 * reserved segments, falling back to "page" when invalid or absent.
 *
 * @param {*} value the raw `pagination` value from route settings
 * @returns {string} the validated segment that was stored
 */
function setPageParam(value) {
    currentPageParam = validatePageParam(value);
    return currentPageParam;
}

module.exports = getPageParam;
module.exports.setPageParam = setPageParam;
module.exports.validatePageParam = validatePageParam;
module.exports.DEFAULT_PAGE_PARAM = DEFAULT_PAGE_PARAM;
