// # Strip Tags Helper
// Usage: `{{strip_tags html}}` or `{{#strip_tags}}...{{/strip_tags}}`
//
// Removes all HTML tags from the given string (inline) or from the rendered block content (block form).
// Each removed tag becomes a single space, HTML entities are decoded, whitespace runs are collapsed and the
// result is trimmed. The output is escaped for the HTML context in both forms; use `{{{strip_tags html}}}`
// for the raw text.

import { load } from 'cheerio/slim';
// @ts-expect-error JavaScript module has no type declarations.
import { SafeString, escapeExpression } from '../services/handlebars';

// Minimal structural view of the htmlparser2 DOM nodes cheerio exposes. The full
// types live in domhandler, which is not a declared dependency of this package.
type DomNode = {
  type: string;
  data?: string;
  name?: string;
  children?: DomNode[];
};

type BlockOptions = { fn?: (context: unknown) => string };

const IGNORED_ELEMENTS = new Set(['script', 'style', 'template']);

function collectText(nodes: DomNode[], parts: string[]): void {
  for (const node of nodes) {
    if (node.type === 'text' && typeof node.data === 'string') {
      parts.push(node.data);
    } else if (
      node.type === 'tag' &&
      node.name &&
      !IGNORED_ELEMENTS.has(node.name) &&
      node.children
    ) {
      collectText(node.children, parts);
    }
  }
}

function stripTags(input: unknown): string {
  if (input instanceof SafeString) {
    return stripTags(String(input));
  }

  if (input === undefined || input === null) {
    return '';
  }

  let html: string;
  if (typeof input === 'string') {
    html = input;
  } else if (typeof input === 'number' || typeof input === 'boolean') {
    html = String(input);
  } else {
    return '';
  }

  // The parser silently drops tags it cannot place, such as an unmatched closing tag, and merges the
  // text on either side into one node. Put a space in front of every tag first so a dropped tag still
  // leaves a word boundary. The extra whitespace collapses below.
  const $ = load(html.replace(/</g, ' <'), null, false);
  const root = $.root()[0] as unknown as { children: DomNode[] };
  const parts: string[] = [];
  collectText(root.children, parts);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// eslint-disable-next-line camelcase
export function strip_tags(this: unknown, ...args: unknown[]): string {
  const options = args.pop() as BlockOptions | undefined;

  // Block form: Handlebars does not escape a block helper's output, so escape it here
  // to keep the result safe by default, matching the inline form.
  if (options && typeof options.fn === 'function') {
    return new SafeString(escapeExpression(stripTags(options.fn(this))));
  }

  return stripTags(args[0]);
}
