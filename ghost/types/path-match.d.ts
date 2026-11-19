// path-match ships no types, so this declares the surface Ghost's TypeScript uses.
// TODO: delete this file when path-match is removed.
declare module 'path-match' {
  interface PathMatchOptions {
    sensitive?: boolean;
    strict?: boolean;
    end?: boolean;
  }

  /** Decoded params, or false when the path doesn't match. Throws a 400 on an undecodable %-escape. */
  type MatchFunction = (
    pathname: string,
    params?: Record<string, string>,
  ) => Record<string, string> | false;

  function pathMatch(options?: PathMatchOptions): (route: string) => MatchFunction;
  export = pathMatch;
}
