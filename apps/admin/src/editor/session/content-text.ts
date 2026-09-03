import { parseLexical, type LexicalInput } from '@/editor/engine/lexical-compare';

const HEADING_PREFIX: Record<string, string> = {
  h1: '# ',
  h2: '## ',
  h3: '### ',
  h4: '#### ',
  h5: '##### ',
  h6: '###### ',
};

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

function inlineText(node: Record<string, unknown>): string {
  const text = stringAt(node, 'text');
  if (text !== null) {
    return text;
  }
  if (node.type === 'linebreak') {
    return '\n';
  }
  return childrenOf(node).map(inlineText).join('');
}

function blocksOf(node: Record<string, unknown>): string[] {
  // Markdown cards hold text the writer typed; every other card is a structure
  // this deliberately does not serialize.
  const markdown = stringAt(node, 'markdown');
  if (markdown !== null) {
    return [markdown];
  }

  if (node.type === 'list') {
    const ordered = node.listType === 'number';
    return childrenOf(node).flatMap((item, index) =>
      blocksOf(item).map((line) => `${ordered ? `${index + 1}. ` : '- '}${line}`),
    );
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
  let root: unknown;
  try {
    root = parseLexical(lexical)?.root;
  } catch {
    return '';
  }
  if (!isRecord(root)) {
    return '';
  }
  return childrenOf(root).flatMap(blocksOf).join('\n\n');
}

/** Title and body as plain text, so a writer can keep work the server refused. */
export function contentToText(title: string, lexical: LexicalInput): string {
  return [title.trim(), lexicalToText(lexical)].filter(Boolean).join('\n\n');
}
