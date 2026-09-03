/**
 * The editor's content as plain text, for a writer who has to keep their work
 * before discarding it.
 *
 * Copied: the title, every text block, and the card properties Koenig counts as
 * text. Not copied: link URLs (except a bookmark card's, which Koenig counts),
 * inline formatting, images and other card media, the excerpt, and the feature
 * image with its caption and alt text.
 */
import { parseLexical, type LexicalInput } from '@/editor/engine/lexical-compare';

const HEADING_PREFIX: Record<string, string> = {
  h1: '# ',
  h2: '## ',
  h3: '### ',
  h4: '#### ',
  h5: '##### ',
  h6: '###### ',
};

// Card properties marked `wordCount: true` in koenig/kg-default-nodes/src/nodes/**,
// in declaration order. Mirrored because the node classes are not importable here.
const CARD_TEXT_PROPS: Record<string, readonly string[]> = {
  bookmark: ['title', 'description', 'url', 'caption'],
  'call-to-action': ['textValue'],
  callout: ['calloutText'],
  codeblock: ['code', 'caption'],
  embed: ['caption'],
  file: ['fileTitle', 'fileCaption'],
  gallery: ['caption'],
  header: ['header', 'subheader'],
  html: ['html'],
  image: ['caption'],
  markdown: ['markdown'],
  product: ['productTitle', 'productDescription'],
  signup: ['disclaimer', 'header', 'subheader'],
  toggle: ['heading', 'content'],
  video: ['caption'],
};

// Properties backed by a nested editor (plus the raw HTML card) serialize HTML.
// Everything else is literal text: treating unknown properties as markup can
// silently remove tag-like text the writer authored.
const HTML_TEXT_PROPS = new Set([
  'bookmark.caption',
  'call-to-action.textValue',
  'callout.calloutText',
  'codeblock.caption',
  'embed.caption',
  'gallery.caption',
  'header.header',
  'header.subheader',
  'html.html',
  'image.caption',
  'product.productTitle',
  'product.productDescription',
  'signup.disclaimer',
  'signup.header',
  'signup.subheader',
  'toggle.heading',
  'toggle.content',
  'video.caption',
]);

const HTML_BLOCK_TAGS = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DD',
  'DIV',
  'DL',
  'DT',
  'FIELDSET',
  'FIGCAPTION',
  'FIGURE',
  'FOOTER',
  'FORM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'LI',
  'MAIN',
  'NAV',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'TBODY',
  'TD',
  'TFOOT',
  'TH',
  'THEAD',
  'TR',
  'UL',
]);
const HTML_BLOCK_BREAK = '\uE000';
const HTML_LINE_BREAK = '\uE001';

// Koenig replaces Lexical's heading and quote nodes with its own; a document
// written before that, or by another editor, still carries the plain types.
const HEADING_TYPES = new Set(['heading', 'extended-heading']);
const QUOTE_TYPES = new Set(['quote', 'extended-quote', 'aside']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringAt(node: Record<string, unknown>, key: string): string | null {
  const value = node[key];
  return typeof value === 'string' ? value : null;
}

function childrenOf(node: Record<string, unknown>): Record<string, unknown>[] {
  return Array.isArray(node.children) ? node.children.filter(isRecord) : [];
}

function isHtmlBlock(node: ChildNode | null): boolean {
  return node?.nodeType === Node.ELEMENT_NODE && HTML_BLOCK_TAGS.has((node as Element).tagName);
}

function renderedTextOf(node: Node, preserveWhitespace = false): string {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    if (preserveWhitespace) {
      return text;
    }
    if (!text.trim() && (isHtmlBlock(node.previousSibling) || isHtmlBlock(node.nextSibling))) {
      return '';
    }
    return text.replace(/\s+/g, ' ');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as Element;
  if (element.matches('script, style, template')) {
    return '';
  }
  if (element.tagName === 'BR') {
    return HTML_LINE_BREAK;
  }

  const text = [...element.childNodes]
    .map((child) => renderedTextOf(child, preserveWhitespace || element.tagName === 'PRE'))
    .join('');
  if (!HTML_BLOCK_TAGS.has(element.tagName) || !text) {
    return text;
  }

  const trimmedStart = text.replace(/^ +/, '');
  const trimmedEnd = text.replace(/ +$/, '');
  const startsWithBreak =
    trimmedStart.startsWith(HTML_BLOCK_BREAK) || trimmedStart.startsWith(HTML_LINE_BREAK);
  const endsWithBreak =
    trimmedEnd.endsWith(HTML_BLOCK_BREAK) || trimmedEnd.endsWith(HTML_LINE_BREAK);
  return `${startsWithBreak ? '' : HTML_BLOCK_BREAK}${text}${endsWithBreak ? '' : HTML_BLOCK_BREAK}`;
}

/** Reads an authored HTML fragment back as the text it renders to. */
function htmlToText(html: string): string {
  const { body } = new DOMParser().parseFromString(html, 'text/html');
  return renderedTextOf(body)
    .replace(new RegExp(`${HTML_BLOCK_BREAK}(?: *${HTML_BLOCK_BREAK})+`, 'g'), HTML_BLOCK_BREAK)
    .replace(new RegExp(`^ *${HTML_BLOCK_BREAK}|${HTML_BLOCK_BREAK} *$`, 'g'), '')
    .replace(new RegExp(` *${HTML_BLOCK_BREAK} *`, 'g'), '\n')
    .replace(new RegExp(HTML_LINE_BREAK, 'g'), '\n');
}

function inlineTextOf(nodes: Record<string, unknown>[]): string {
  return nodes.map(inlineText).join('');
}

function inlineText(node: Record<string, unknown>): string {
  const text = stringAt(node, 'text');
  if (text !== null) {
    return text;
  }
  if (node.type === 'linebreak') {
    return '\n';
  }
  return inlineTextOf(childrenOf(node));
}

function cardText(node: Record<string, unknown>, props: readonly string[]): string[] {
  const type = stringAt(node, 'type');
  const lines = props
    .map((prop) => {
      const value = stringAt(node, prop);
      if (!value) {
        return '';
      }
      return type && HTML_TEXT_PROPS.has(`${type}.${prop}`) ? htmlToText(value) : value;
    })
    .filter(Boolean);

  return lines.length > 0 ? [lines.join('\n')] : [];
}

/** One block per list, its items on their own lines and nested items indented. */
function listLines(node: Record<string, unknown>, depth: number): string[] {
  const ordered = node.listType === 'number';
  const indent = '  '.repeat(depth);

  return childrenOf(node).flatMap((item, index) => {
    const nested = childrenOf(item).filter((child) => child.type === 'list');
    const own = inlineTextOf(childrenOf(item).filter((child) => child.type !== 'list'));
    const nestedLines = nested.flatMap((child) => listLines(child, depth + 1));
    const marker = ordered ? `${index + 1}. ` : '- ';

    return own ? [`${indent}${marker}${own}`, ...nestedLines] : nestedLines;
  });
}

function blocksOf(node: Record<string, unknown>): string[] {
  const cardProps = typeof node.type === 'string' ? CARD_TEXT_PROPS[node.type] : undefined;
  if (cardProps) {
    return cardText(node, cardProps);
  }

  if (node.type === 'list') {
    const lines = listLines(node, 0);
    return lines.length > 0 ? [lines.join('\n')] : [];
  }

  const text = inlineText(node);
  if (!text) {
    return [];
  }
  if (typeof node.type === 'string' && HEADING_TYPES.has(node.type)) {
    return [`${HEADING_PREFIX[stringAt(node, 'tag') ?? ''] ?? ''}${text}`];
  }
  if (typeof node.type === 'string' && QUOTE_TYPES.has(node.type)) {
    return [`> ${text}`];
  }
  return [text];
}

/** The document's text, blocks separated by blank lines; unreadable Lexical yields nothing. */
export function lexicalToText(lexical: LexicalInput): string {
  try {
    const root = parseLexical(lexical)?.root;
    if (!isRecord(root)) {
      return '';
    }
    return childrenOf(root).flatMap(blocksOf).join('\n\n');
  } catch {
    return '';
  }
}

/** Title and body as plain text, so a writer can keep work the server refused. */
export function contentToText(title: string, lexical: LexicalInput): string {
  return [title.trim(), lexicalToText(lexical)].filter(Boolean).join('\n\n');
}
