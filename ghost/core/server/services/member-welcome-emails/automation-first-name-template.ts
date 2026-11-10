import { randomUUID } from 'node:crypto';
import * as cheerio from 'cheerio/slim';
import { escapeExpression } from 'handlebars';

export const unsubscribePlaceholder = `https://ghost.example/unsubscribe/${randomUUID()}`;
const firstNamePlaceholder = `GhostFirstName${randomUUID().replaceAll('-', '')}`;

export type FirstNameSlot = { marker: string; fallback?: string };
export type FirstNameTemplate = {
  html: string;
  text: string;
  subject: string;
  slots: FirstNameSlot[];
};

export function getFirstName(name: string | null | undefined) {
  return name?.trim().split(/\s+/)[0] || undefined;
}

export function addFirstNameSlot(slots: FirstNameSlot[], fallback?: string) {
  const marker = `${firstNamePlaceholder}Slot${slots.length}End`;
  slots.push({ marker, fallback });
  return marker;
}

export function hasFirstNameTextSlots(html: string, slots: FirstNameSlot[]) {
  const $ = cheerio.load(html, null, false);
  const eligibleText = $('p, p span, p strong, p em, p b, p i, p u, p s')
    .filter(
      (_, element) => !$(element).closest('a, pre, code, .preheader, .preheader-spacing').length,
    )
    .contents()
    .toArray()
    .flatMap((node) => (node.type === 'text' ? [node.data] : []));
  return slots.every(({ marker }) => eligibleText.some((text) => text.includes(marker)));
}

export function escapeUnsubscribeHref(url: string) {
  // Match the serializer's output for the quoted href so batching can recognize it.
  return escapeExpression(url).replaceAll('&#x3D;', '=');
}

export function personalizeFirstNameTemplate({
  template,
  name,
  unsubscribeUrl,
}: {
  template: FirstNameTemplate;
  name?: string | null;
  unsubscribeUrl?: string;
}) {
  const firstName = getFirstName(name);
  const variables: Record<string, string> = {};
  let html = template.html;
  let text = template.text;
  if (unsubscribeUrl) {
    html = html.replaceAll(unsubscribePlaceholder, () => escapeUnsubscribeHref(unsubscribeUrl));
    text = text.replaceAll(unsubscribePlaceholder, () => unsubscribeUrl);
  }
  let batchHtml = html;
  let batchText = text;
  for (const [index, { marker, fallback }] of template.slots.entries()) {
    const value = firstName || fallback;
    // Empty values or whitespace can change plaintext normalization. Preserve
    // the original rendering path for those values and for provider syntax.
    if (!value || /[\s\u0000-\u001f\u007f-\u009f]/u.test(value) || value.includes('%recipient.')) {
      return null;
    }
    const key = `automation_first_name_${index}`;
    const escaped = escapeExpression(value);
    variables[key] = value;
    variables[`${key}_html`] = escaped;
    html = html.replace(marker, () => escaped);
    text = text.replace(marker, () => value);
    batchHtml = batchHtml.replace(marker, `%recipient.${key}_html%`);
    batchText = batchText.replace(marker, `%recipient.${key}%`);
  }
  return {
    html,
    text,
    subject: template.subject,
    batchBody: { html: batchHtml, text: batchText, variables },
  };
}
