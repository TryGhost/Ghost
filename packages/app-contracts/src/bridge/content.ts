import { isRecord } from './rules.ts';

/**
 * What a write of posts, pages or tags may not contain:
 *
 * - `codeinjection_head` and `codeinjection_foot`, with any value, `null` included: Ghost
 *   outputs them as they are on every page that shows the post or tag. Leave them out of the
 *   body.
 * - `mobiledoc`, unless it's `null`: it's deprecated and Ghost 7.0 removes it, so apps write
 *   `lexical` from the start.
 *
 * The whole body is checked, at any depth, so a field can't hide in a nested object, such as a
 * tag in a post's `tags`.
 */

const ALWAYS_REFUSED = ['codeinjection_head', 'codeinjection_foot'];

/**
 * Returns the field refused in the body of a write of posts, pages or tags, such as
 * `codeinjection_head`, or `undefined` when nothing is. Takes the body parsed from JSON.
 */
export function refusedContent(body: unknown): string | undefined {
  const values: unknown[] = [body];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!isRecord(value)) {
      continue;
    }
    for (const [key, field] of Object.entries(value)) {
      if (ALWAYS_REFUSED.includes(key) || (key === 'mobiledoc' && field !== null)) {
        return key;
      }
      values.push(field);
    }
  }
  return undefined;
}
