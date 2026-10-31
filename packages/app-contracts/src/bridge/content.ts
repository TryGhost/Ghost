import { isRecord } from './rules.ts';

/**
 * What a write of posts, pages or tags may not contain:
 *
 * - `codeinjection_head` and `codeinjection_foot` with a value: Ghost outputs them as they are on
 *   every page that shows the post or tag. On the post, page or tag being written they're refused
 *   even as `null`, which would clear them; leave them out of the body. Deeper, as on a tag in a
 *   post's `tags`, `null` is allowed, because that's how Ghost returns them, so an app can send
 *   back the tags it read. Ghost keeps only a nested tag's `id`, `name` and `slug` anyway.
 * - `mobiledoc`, unless it's `null`: it's deprecated and Ghost 7.0 removes it, so apps write
 *   `lexical` from the start.
 *
 * The whole body is checked, at any depth, so a field can't hide in a nested object.
 */

const CODE_INJECTION = ['codeinjection_head', 'codeinjection_foot'];

/**
 * `written` is the body itself and the objects being written: the items of the body's top-level
 * lists, as in `{ posts: [post] }`. `list` is one of those lists. Everything below is `nested`.
 */
type Place = 'written' | 'list' | 'nested';

function childPlace(parentIsBody: boolean, parent: Place, child: unknown): Place {
  if (parent === 'list') {
    return 'written';
  }
  if (parentIsBody) {
    return Array.isArray(child) ? 'list' : 'written';
  }
  return 'nested';
}

/**
 * Returns the field refused in the body of a write of posts, pages or tags, such as
 * `codeinjection_head`, or `undefined` when nothing is. Takes the body parsed from JSON.
 */
export function refusedContent(body: unknown): string | undefined {
  const values: { value: unknown; place: Place }[] = [{ value: body, place: 'written' }];
  for (let index = 0; index < values.length; index += 1) {
    const { value, place } = values[index] as { value: unknown; place: Place };
    if (!isRecord(value)) {
      continue;
    }
    for (const [key, field] of Object.entries(value)) {
      if (CODE_INJECTION.includes(key) && (place === 'written' || field !== null)) {
        return key;
      }
      if (key === 'mobiledoc' && field !== null) {
        return key;
      }
      values.push({ value: field, place: childPlace(value === body, place, field) });
    }
  }
  return undefined;
}
