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

// The rest of those properties hold HTML the writer authored in a nested editor.
const LITERAL_TEXT_PROPS = new Set(['code', 'markdown']);

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

/** Reads an authored HTML fragment back as the text it renders to. */
function htmlToText(html: string): string {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
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
  const lines = props
    .map((prop) => {
      const value = stringAt(node, prop);
      if (!value) {
        return '';
      }
      return LITERAL_TEXT_PROPS.has(prop) ? value : htmlToText(value);
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
  if (node.type === 'heading') {
    return [`${HEADING_PREFIX[stringAt(node, 'tag') ?? ''] ?? ''}${text}`];
  }
  if (node.type === 'quote') {
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
