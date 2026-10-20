import { textHasTk } from '@/utils/tk';
import { z } from 'zod';
import type { AutomationDetail } from '@tryghost/admin-x-framework/api/automations';

export function emailsWithTk(automation: AutomationDetail | undefined) {
  return (automation?.actions ?? []).flatMap((action, index) => {
    if (action.type !== 'send_email') {
      return [];
    }
    const tk = inspectEmailTk(action.data.email_subject, action.data.email_lexical);
    return tk.subject || tk.body
      ? [{ id: action.id, subject: action.data.email_subject, position: index + 1 }]
      : [];
  });
}

// Koenig's TKPlugin also accepts Tk/tk and treats em dashes as word boundaries.
const BODY_TK_REGEX = /(^|.)([^\p{L}\p{N}\s]*(TK|Tk|tk)+[^\p{L}\p{N}\s]*)(.)?/u;
const WORD_CHAR_REGEX = /\p{L}|\p{N}/u;

export function bodyTextHasTk(text: string): boolean {
  let match = BODY_TK_REGEX.exec(text);
  while (match) {
    const invalidBefore = match[1] && WORD_CHAR_REGEX.test(match[1]) && !match[2].startsWith('—');
    const invalidAfter = match[4] && WORD_CHAR_REGEX.test(match[4]) && !match[2].endsWith('—');
    if (!invalidBefore && !invalidAfter) {
      return true;
    }
    text = text.slice(match.index + match[0].length - 1);
    match = BODY_TK_REGEX.exec(text);
  }
  return false;
}

const documentSchema = z.object({
  root: z.object({ children: z.array(z.unknown()) }),
});
const nodeSchema = z
  .object({
    type: z.string(),
    children: z.array(z.unknown()).optional(),
  })
  .passthrough();

// Only fields backed by Koenig nested editors participate in post TK detection.
// HTML/Markdown source cards, button labels, alt text and embed metadata do not.
const nestedHtmlFields: Record<string, string[]> = {
  image: ['caption'],
  bookmark: ['caption'],
  embed: ['caption'],
  callout: ['calloutText'],
  'email-cta': ['html'],
  'call-to-action': ['textValue', 'sponsorLabel'],
  product: ['productTitle', 'productDescription'],
};
const blocks = new Set([
  'paragraph',
  'heading',
  'extended-heading',
  'quote',
  'extended-quote',
  'listitem',
]);

function htmlHasTk(html: string): boolean {
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('script, style, template').forEach((element) => element.remove());
  // Preserve inline formatting boundaries, but never join separate paragraphs.
  document
    .querySelectorAll('br, p, div, li, h1, h2, h3, h4, h5, h6, blockquote')
    .forEach((element) => element.append('\n'));
  return (document.body.textContent || '').split('\n').some(bodyTextHasTk);
}

export type EmailTkInspection = {
  subject: boolean;
  body: boolean;
  contentError: boolean;
};

/** Inspect saved content without mounting (and normalizing) an editor. */
export function inspectEmailTk(subject: string, lexical: string | null): EmailTkInspection {
  const result = { subject: textHasTk(subject), body: false, contentError: false };
  if (!lexical?.trim()) {
    return result;
  }
  try {
    const document = documentSchema.parse(JSON.parse(lexical));
    let text = '';
    const read = (value: unknown) => {
      const node = nodeSchema.parse(value);
      if (['text', 'extended-text', 'tk'].includes(node.type)) {
        text += z.string().parse(node.text);
        return;
      }
      if (node.type === 'linebreak') {
        text += '\n';
        return;
      }
      for (const field of nestedHtmlFields[node.type] || []) {
        if (node[field] !== undefined) {
          result.body = htmlHasTk(z.string().parse(node[field])) || result.body;
        }
      }
      if (node.children) {
        node.children.forEach(read);
      } else {
        text += '\n';
      }
      if (blocks.has(node.type)) {
        text += '\n';
      }
    };
    document.root.children.forEach(read);
    result.body = text.split('\n').some(bodyTextHasTk) || result.body;
  } catch {
    result.contentError = true;
  }
  return result;
}
