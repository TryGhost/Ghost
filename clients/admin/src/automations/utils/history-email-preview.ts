import { z } from 'zod';

const documentSchema = z.object({
  root: z.object({ children: z.array(z.unknown()) }),
});
const nodeSchema = z.object({
  type: z.string(),
  text: z.unknown().optional(),
  children: z.array(z.unknown()).optional(),
});

const EXCERPT_LENGTH = 400;
const blocks = new Set([
  'paragraph',
  'heading',
  'extended-heading',
  'quote',
  'extended-quote',
  'listitem',
]);

// Read a short snippet from ordinary Lexical text nodes. Card payloads are not
// rendered or interpreted as HTML; React displays the result as literal text.
export function emailTextExcerpt(lexical: string | null): string {
  if (!lexical?.trim()) {
    return '';
  }
  const parsed: unknown = JSON.parse(lexical);
  const document = documentSchema.parse(parsed);
  let text = '';
  const read = (value: unknown) => {
    if (text.length > EXCERPT_LENGTH) {
      return;
    }
    const node = nodeSchema.parse(value);
    switch (node.type) {
      case 'text':
      case 'extended-text':
        if (typeof node.text !== 'string') {
          throw new Error('Invalid email text node');
        }
        text += node.text.replace(/\s+/g, ' ').slice(0, EXCERPT_LENGTH + 1 - text.length);
        return;
      case 'linebreak':
        text += ' ';
        return;
    }
    // Rich cards keep their contents in properties rather than text children.
    if (node.children) {
      for (const child of node.children) {
        read(child);
        if (text.length > EXCERPT_LENGTH) {
          break;
        }
      }
    }
    if (blocks.has(node.type)) {
      text += ' ';
    }
  };
  for (const node of document.root.children) {
    read(node);
    if (text.length > EXCERPT_LENGTH) {
      break;
    }
  }
  const excerpt = text.replace(/\s+/g, ' ').trim();
  return excerpt.length > EXCERPT_LENGTH
    ? `${excerpt.slice(0, EXCERPT_LENGTH).trimEnd()}…`
    : excerpt;
}
