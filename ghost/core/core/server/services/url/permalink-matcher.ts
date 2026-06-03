/**
 * Matches a Ghost permalink template (e.g. `/:slug/`, `/:year/:month/:slug/`)
 * against a URL path and extracts the `:field` placeholders. Returns the
 * captured params, or `null` when the path doesn't match.
 *
 * Walks segment-by-segment rather than using a regex: Ghost only uses
 * whole-segment placeholders, so this avoids any ReDoS risk on
 * attacker-controlled paths. Mixed literal+placeholder segments (`/blog-:slug/`)
 * are unsupported and treated as non-matches.
 */
export function matchPermalink(template: string, urlPath: string): Record<string, string> | null {
    if (typeof template !== 'string' || typeof urlPath !== 'string') {
        return null;
    }

    const templateSegments = template.split('/');
    const pathSegments = urlPath.split('/');

    if (templateSegments.length !== pathSegments.length) {
        return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < templateSegments.length; i += 1) {
        const templateSegment = templateSegments[i];
        const pathSegment = pathSegments[i];

        if (templateSegment.startsWith(':')) {
            const fieldName = templateSegment.slice(1);

            if (!/^\w+$/.test(fieldName) || pathSegment.length === 0) {
                return null;
            }

            try {
                params[fieldName] = decodeURIComponent(pathSegment);
            } catch {
                // Malformed %-escapes throw URIError; treat as a non-match.
                return null;
            }
        } else if (templateSegment !== pathSegment) {
            return null;
        }
    }

    return params;
}

module.exports = {matchPermalink};
module.exports.matchPermalink = matchPermalink;
