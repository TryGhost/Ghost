/**
 * How many parameters an app's query may have. Ghost's query parser reads 1,000 and drops the
 * rest without an error; no request needs anywhere near as many, so the bridge stops far short
 * of the point where it and the server could disagree on what was sent.
 */
export const QUERY_PARAMETER_LIMIT = 100;

/** A query's parameters, in the order they were written: each name once, with its value decoded. */
export type Query = ReadonlyMap<string, string>;

// Letters, digits and `_`, which every parameter the Admin API reads is made of
const NAME = /^\w+$/;

/**
 * Reads the query an app wrote, strictly, so the bridge can write the one it sends itself
 * (`writeQuery`) instead of passing the app's spelling on.
 *
 * Query parsers disagree about anything unusual: Ghost's reads `include[]`, `[include]` and
 * `%69nclude` as `include`, splits a part at `]=` before `=`, and makes a list of a name that
 * repeats, none of which a URL parser does. The bridge decides what to refuse and what to
 * rewrite from a request's parameters, so a parameter it read one way and the server another
 * would be a check the request walks past. Rather than copy the server's parser, it only takes
 * a query that every parser reads the same way, and refuses the rest:
 *
 * - a name must be plain word characters, so it has no brackets, raw or escaped, no escapes at
 *   all and no spaces;
 * - a name may appear once;
 * - a name can't be one every object already has, such as `__proto__`, which a parser may drop;
 * - a value's escapes must be well formed, and `+` in one is a space;
 * - there may be no more than `QUERY_PARAMETER_LIMIT` parameters.
 *
 * A part without `=` is a name with an empty value, and empty parts are skipped. Values are
 * free: brackets, colons, commas and anything else a filter needs are decoded here and escaped
 * again when the query is written.
 *
 * Returns the parameters, or why the query is refused, as a sentence for the app's developer.
 */
export function readQuery(search: string): { parameters: Query } | { refused: string } {
  const parts = search
    .replace(/^\?/, '')
    .split('&')
    .filter((part) => part !== '');
  if (parts.length > QUERY_PARAMETER_LIMIT) {
    return { refused: `Apps can't send more than ${QUERY_PARAMETER_LIMIT} query parameters` };
  }

  const parameters = new Map<string, string>();
  for (const part of parts) {
    const split = part.indexOf('=');
    const name = split === -1 ? part : part.slice(0, split);
    if (!NAME.test(name) || name in Object.prototype) {
      return {
        refused: `Apps can't send a query parameter named ${name}: a name may only have letters, digits and _`,
      };
    }
    if (parameters.has(name)) {
      return { refused: `Apps can't send the ${name} parameter more than once` };
    }
    try {
      parameters.set(
        name,
        split === -1 ? '' : decodeURIComponent(part.slice(split + 1).replace(/\+/g, ' ')),
      );
    } catch {
      return { refused: `Apps can't send a ${name} parameter with a malformed escape in it` };
    }
  }
  return { parameters };
}

/**
 * Writes a query the one way every parser reads alike: `name=value`, each value escaped whole,
 * joined with `&`. Ghost's server reads back exactly the names and values written, which a test
 * in Ghost holds to the parser its Express apps are set up with.
 */
export function writeQuery(query: Query): string {
  return [...query].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('&');
}
