/**
 * What a write of posts, pages or tags may contain. Ghost serves a post's HTML on the site's own
 * origin without sanitising it, so an app that could put script in a post could run it as the
 * site, and as Admin where the two share an origin. These checks keep script out of what an app
 * writes.
 *
 * - `codeinjection_head` and `codeinjection_foot`, on posts, pages and tags, are refused with
 *   any value, `null` included: Ghost outputs them as they are on every page that shows the post
 *   or tag. Leave them out of the body.
 * - `mobiledoc` is refused unless it's `null`: Ghost converts it to Lexical, cards and all.
 * - `feature_image_caption` is refused when it holds `<`: emails show it as HTML.
 * - `lexical` may hold only text: paragraphs, headings, lists, quotes, asides, links, line
 *   breaks, tabs and horizontal rules. Every card is refused, because nearly every card renders
 *   at least one of its fields as HTML, as its caption for one. So are a heading whose tag isn't
 *   `h1` to `h6`, a list whose type or start isn't plain, and a link to anything but an `http`,
 *   `https`, `mailto` or `tel` URL, since Ghost writes all of those into the HTML unchecked. A
 *   node type Ghost doesn't know is refused too: Ghost would drop it and everything after it.
 *
 * The whole body is checked, at any depth, so a field can't hide in a nested object.
 */

const ALWAYS_REFUSED = ['codeinjection_head', 'codeinjection_foot'];

// Text nodes and the elements that hold them. Cards are left out.
const TEXT_NODES = new Set([
  'root',
  'paragraph',
  'text',
  'extended-text',
  'linebreak',
  'tab',
  'tk',
  'zwnj',
  'heading',
  'extended-heading',
  'list',
  'listitem',
  'quote',
  'extended-quote',
  'aside',
  'link',
  'horizontalrule',
]);

const HEADING_TAG = /^h[1-6]$/;
const LIST_TYPES = new Set(['bullet', 'number', 'check']);
const LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
// Only used as a base, so a relative link parses.
const LINK_BASE = 'https://site.invalid/';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPlainLink(url: unknown): boolean {
  if (typeof url !== 'string') {
    return false;
  }
  try {
    return LINK_PROTOCOLS.has(new URL(url, LINK_BASE).protocol);
  } catch {
    return false;
  }
}

const isOptionalInteger = (value: unknown) => value === undefined || Number.isSafeInteger(value);

/** Returns what's refused in one Lexical node, ignoring its children. */
function refusedNode(node: Record<string, unknown>): string | undefined {
  const { type } = node;
  if (typeof type !== 'string') {
    return 'lexical with a node that has no type';
  }
  if (!TEXT_NODES.has(type)) {
    return `lexical with a "${type}" node`;
  }
  if ((type === 'heading' || type === 'extended-heading') && !HEADING_TAG.test(String(node.tag))) {
    return `lexical with a "${type}" node whose tag isn't h1 to h6`;
  }
  if (
    type === 'list' &&
    (!LIST_TYPES.has(String(node.listType)) || !isOptionalInteger(node.start))
  ) {
    return 'lexical with a "list" node whose type or start isn\'t plain';
  }
  if (type === 'listitem' && !isOptionalInteger(node.value)) {
    return 'lexical with a "listitem" node whose value isn\'t a number';
  }
  if (type === 'link' && !isPlainLink(node.url)) {
    return "lexical with a link to a URL that isn't http, https, mailto or tel";
  }
  return undefined;
}

/** Returns what's refused in a post's Lexical, or `undefined` when it's only text. */
function refusedLexical(lexical: unknown): string | undefined {
  if (lexical === null) {
    return undefined;
  }
  if (typeof lexical !== 'string') {
    return "lexical that isn't text";
  }
  let document: unknown;
  try {
    document = JSON.parse(lexical);
  } catch {
    return "lexical that isn't JSON";
  }
  const root = isRecord(document) ? document.root : undefined;
  if (!isRecord(root) || root.type !== 'root') {
    return 'lexical without a root node';
  }
  // Walked with a stack rather than recursion, so a deeply nested document can't overflow it.
  const nodes: Record<string, unknown>[] = [root];
  for (let node = nodes.pop(); node; node = nodes.pop()) {
    const refused = refusedNode(node);
    if (refused) {
      return refused;
    }
    const { children } = node;
    if (children === undefined) {
      continue;
    }
    if (!Array.isArray(children) || !children.every(isRecord)) {
      return `lexical with a "${String(node.type)}" node whose children aren't nodes`;
    }
    nodes.push(...children);
  }
  return undefined;
}

/**
 * Returns what's refused in the body of a write of posts, pages or tags, such as
 * `codeinjection_head` or `lexical with a "html" node`, or `undefined` when nothing is. Takes
 * the body parsed from JSON.
 */
export function refusedContent(
  kind: 'posts' | 'pages' | 'tags',
  body: unknown,
): string | undefined {
  const values: unknown[] = [body];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!isRecord(value)) {
      continue;
    }
    for (const [key, field] of Object.entries(value)) {
      if (ALWAYS_REFUSED.includes(key)) {
        return key;
      }
      if (kind !== 'tags') {
        if (key === 'mobiledoc' && field !== null) {
          return 'mobiledoc';
        }
        if (key === 'feature_image_caption' && typeof field === 'string' && field.includes('<')) {
          return 'a feature_image_caption with HTML in it';
        }
        if (key === 'lexical') {
          const refused = refusedLexical(field);
          if (refused) {
            return refused;
          }
          continue;
        }
      }
      values.push(field);
    }
  }
  return undefined;
}
