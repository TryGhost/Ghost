// Placeholder names are word chars only (\w === [A-Za-z0-9_]); a literal scan
// keeps the matcher regex-free, so no regex ever runs on a request path.
function isWordChars(value: string): boolean {
    if (value.length === 0) {
        return false;
    }
    for (let i = 0; i < value.length; i += 1) {
        const code = value.charCodeAt(i);
        const isDigit = code >= 48 && code <= 57;
        const isUpper = code >= 65 && code <= 90;
        const isLower = code >= 97 && code <= 122;
        const isUnderscore = code === 95;
        if (!isDigit && !isUpper && !isLower && !isUnderscore) {
            return false;
        }
    }
    return true;
}

/**
 * Matches a permalink template (e.g. `/:slug/`) against a URL path and extracts
 * the `:field` placeholders, or returns `null` when the path doesn't match.
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

        if (!templateSegment.startsWith(':')) {
            if (templateSegment !== pathSegment) {
                return null;
            }
            continue;
        }

        const fieldName = templateSegment.slice(1);
        if (!isWordChars(fieldName) || pathSegment.length === 0) {
            return null;
        }

        try {
            params[fieldName] = decodeURIComponent(pathSegment);
        } catch {
            return null;
        }
    }

    return params;
}

module.exports = {matchPermalink};
module.exports.matchPermalink = matchPermalink;
