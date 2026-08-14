/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/data/match-permalink-params.js @ 407e032dc7 —
// transforms: CJS → ESM; the `path-match@1.2.4` wrapper package is inlined
// below (its whole body is ~30 lines over path-to-regexp@1) so we depend on
// path-to-regexp directly — `http-errors` 400 on a bad URI component →
// @tryghost/errors ValidationError (handled as a router fall-through, which
// ends in a 404 like upstream's 400 does for theme traffic).
import pathToRegexp from 'path-to-regexp';
import errors from '@tryghost/errors';

// --- inlined path-match@1.2.4 (index.js) ---
function decodeParam(param: string): string {
    try {
        return decodeURIComponent(param);
    } catch {
        throw new errors.ValidationError({message: 'failed to decode param "' + param + '"'});
    }
}

function routeMatch(path: string) {
    const keys: any[] = [];
    const re = (pathToRegexp as any)(path, keys);

    return function match(pathname: string, params?: Record<string, any>) {
        const m = re.exec(pathname);
        if (!m) {
            return false;
        }

        params = params || {};

        let key;
        let param;
        for (let i = 0; i < keys.length; i++) {
            key = keys[i];
            param = m[i + 1];
            if (!param) {
                continue;
            }
            params[key.name] = decodeParam(param);
            if (key.repeat) {
                params[key.name] = params[key.name].split(key.delimiter);
            }
        }

        return params;
    };
}
// --- end inlined path-match ---

const PARAM = /:([A-Za-z_]\w*)(?:\([^)]*\))?[+*?]?/g;
const BARE_PARAM = /:([A-Za-z_]\w*)(?![\w(])/g;

function constrainHyphenatedPermalinkParams(permalinks: string): string {
    // Hyphen-separated params need explicit bounds so earlier params do not
    // consume hyphenated values that belong to later params.
    return permalinks.split('/').map((segment) => {
        if (!segment.includes('-')) {
            return segment;
        }

        const params = [...segment.matchAll(PARAM)];

        if (params.length < 2) {
            return segment;
        }

        return segment.replace(BARE_PARAM, (match, ...args) => {
            const offset = args[args.length - 2];
            const index = params.findIndex(param => param.index === offset);
            const isLastParamInSegment = index === params.length - 1;

            return `${match}${isLastParamInSegment ? '([^/]+)' : '([^-/]+)'}`;
        });
    }).join('/');
}

// PERF (worker-readiness): path-to-regexp compilation was redone 3–4× per
// request for the same permalink strings; the permalink set comes from route
// config (a handful of strings per site), so memoize per permalink string.
const matchFuncCache = new Map<string, ReturnType<typeof routeMatch>>();

export default function matchPermalinkParams(permalinks: string, targetPath: string): Record<string, any> | false {
    let matchFunc = matchFuncCache.get(permalinks);
    if (!matchFunc) {
        matchFunc = routeMatch(constrainHyphenatedPermalinkParams(permalinks));
        matchFuncCache.set(permalinks, matchFunc);
    }
    return matchFunc(targetPath);
}
