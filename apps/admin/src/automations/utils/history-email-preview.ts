import { htmlToText, parseLexical } from '@/editor/api';
import { render as renderMarkdown } from '@tryghost/kg-markdown-html-renderer';

export type HistoryEmailContent =
  | { state: 'available'; text: string }
  | { state: 'empty' | 'unavailable' | 'no_text' };

export type HistoryEmailPreview = {
  subject: string | null;
  content: HistoryEmailContent;
};

const textContainers = new Set([
  'paragraph',
  'heading',
  'extended-heading',
  'quote',
  'extended-quote',
  'aside',
  'list',
  'listitem',
  'link',
  'autolink',
]);

// Only a document made of empty text structures is known to be empty. A media
// card or an unknown node may contain content that a text excerpt cannot show.
function isEmptyText(node: unknown): boolean {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    throw new Error('Invalid historical content node');
  }
  const record = node as Record<string, unknown>;
  if (
    typeof record.type !== 'string' ||
    (record.children !== undefined && !Array.isArray(record.children))
  ) {
    throw new Error('Invalid historical content node');
  }
  const emptyChildren = Array.isArray(record.children)
    ? record.children.map(isEmptyText).every(Boolean)
    : true;
  if (record.type === 'text' || record.type === 'extended-text') {
    if (typeof record.text !== 'string') {
      throw new Error('Invalid historical text');
    }
    return !record.text.trim();
  }
  return record.type === 'linebreak' || (textContainers.has(record.type) && emptyChildren);
}

// Preview visible text without the Markdown markers used by the editor's
// recovery/export format. Authored markup stays detached and is never mounted.
const cardFields: Record<string, string[]> = {
  button: ['buttonText'],
  callout: ['calloutText'],
  html: ['html'],
  header: ['header', 'subheader', 'buttonText'],
  'call-to-action': ['textValue', 'buttonText'],
  toggle: ['heading', 'content'],
  product: ['productTitle', 'productDescription', 'productButton'],
  signup: ['header', 'subheader', 'disclaimer', 'buttonText'],
  image: ['caption'],
  gallery: ['caption'],
  video: ['caption'],
  embed: ['caption'],
};
function previewText(node: Record<string, unknown>): string {
  if (node.type === 'text' || node.type === 'extended-text') {
    return node.text as string;
  }
  if (node.type === 'linebreak') {
    return '\n';
  }
  if (node.type === 'markdown') {
    return typeof node.markdown === 'string' ? htmlToText(renderMarkdown(node.markdown)) : '';
  }
  if (node.type === 'bookmark' || node.type === 'file') {
    const fields = node.type === 'bookmark' ? ['title', 'description', 'url'] : ['fileTitle'];
    const plain = fields
      .map((key) => (typeof node[key] === 'string' ? node[key] : ''))
      .filter(Boolean);
    const caption = node.type === 'bookmark' ? node.caption : node.fileCaption;
    return [...plain, typeof caption === 'string' ? htmlToText(caption) : '']
      .filter(Boolean)
      .join('\n');
  }
  if (node.type === 'codeblock') {
    return typeof node.code === 'string' ? node.code : '';
  }
  const fields =
    typeof node.type === 'string' && Object.hasOwn(cardFields, node.type)
      ? cardFields[node.type]
      : undefined;
  if (fields) {
    return fields
      .map((key) => (typeof node[key] === 'string' ? htmlToText(node[key]) : ''))
      .filter(Boolean)
      .join('\n');
  }
  const children = Array.isArray(node.children) ? node.children : [];
  const separator = node.type === 'list' ? '\n' : '';
  return children.map(previewText).join(separator);
}

export function historyEmailPreview(
  subject: string | null,
  lexical: string | null,
): HistoryEmailPreview {
  if (lexical === null) {
    return { subject, content: { state: 'unavailable' } };
  }
  if (!lexical.trim()) {
    return { subject, content: { state: 'empty' } };
  }
  try {
    const document = parseLexical(lexical);
    const root = document!.root as { children: unknown[] };
    const empty = root.children.map(isEmptyText).every(Boolean);
    if (empty) {
      return { subject, content: { state: 'empty' } };
    }
    const text = root.children
      .map((node) => previewText(node as Record<string, unknown>))
      .filter(Boolean)
      .join('\n\n')
      .trim();
    return { subject, content: text ? { state: 'available', text } : { state: 'no_text' } };
  } catch {
    return { subject, content: { state: 'unavailable' } };
  }
}
