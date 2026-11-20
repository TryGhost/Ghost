import pathMatch from 'path-match';

const routeMatch = pathMatch();

const PARAM = /:([A-Za-z_]\w*)(?:\([^)]*\))?[+*?]?/g;
const BARE_PARAM = /:([A-Za-z_]\w*)(?![\w(])/g;

function constrainHyphenatedPermalinkParams(permalinks: string): string {
  // Hyphen-separated params need explicit bounds so earlier params do not
  // consume hyphenated values that belong to later params.
  return permalinks
    .split('/')
    .map((segment) => {
      if (!segment.includes('-')) {
        return segment;
      }

      const params = [...segment.matchAll(PARAM)];

      if (params.length < 2) {
        return segment;
      }

      return segment.replace(BARE_PARAM, (match, ...args) => {
        const offset = args[args.length - 2];
        const index = params.findIndex((param) => param.index === offset);
        const isLastParamInSegment = index === params.length - 1;

        return `${match}${isLastParamInSegment ? '([^/]+)' : '([^-/]+)'}`;
      });
    })
    .join('/');
}

export function matchPermalinkParams(
  permalinks: string,
  targetPath: string,
): Record<string, string> | false {
  const matchFunc = routeMatch(constrainHyphenatedPermalinkParams(permalinks));
  return matchFunc(targetPath);
}
