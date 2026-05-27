const routeMatch = require('path-match')();

const PARAM = /:([A-Za-z_]\w*)(?:\([^)]*\))?[+*?]?/g;
const BARE_PARAM = /:([A-Za-z_]\w*)(?![\w(])/g;

function constrainHyphenatedPermalinkParams(permalinks) {
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

module.exports = function matchPermalinkParams(permalinks, targetPath) {
    const matchFunc = routeMatch(constrainHyphenatedPermalinkParams(permalinks));
    return matchFunc(targetPath);
};
