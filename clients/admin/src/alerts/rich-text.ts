/** Plain text is escaped; `{html}` renders as markup and is only for trusted, app- or server-authored content. */
export type RichText = string | { html: string };

export function richTextValue(text: RichText): string {
  return typeof text === 'string' ? text : text.html;
}
