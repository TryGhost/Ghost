import { load } from 'cheerio';

/** Parent identity belongs to the current response, never saved authoring props. */
export function withAddonPostContext(
  html: string | null | undefined,
  postId: unknown,
  postUrl?: string,
) {
  if (typeof html !== 'string' || !html.includes('kg-addon-card')) {
    return html;
  }
  const $ = load(html, { sourceCodeLocationInfo: true }, false);
  const cards = $('figure.kg-addon-card[data-addon-id]');
  cards.removeAttr('data-addon-post-id');
  if (typeof postId === 'string' && /^[\da-f]{24}$/i.test(postId)) {
    cards.attr('data-addon-post-id', postId);
  }
  const links = cards
    .find('template.kg-addon-card-portable')
    .contents()
    .find('a[data-ghost-post-link]');
  links.removeAttr('href');
  try {
    const url = new URL(postUrl || '');
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) {
      links.attr('href', url.href);
    }
  } catch {
    // Missing context must never preserve a copied parent URL.
  }
  // Only replace opening tags. Serializing the post would also rewrite unrelated
  // HTML, including raw text, entities, iframe srcdoc and portable fallbacks.
  const replacements = cards
    .add(links)
    .toArray()
    .flatMap((card) => {
      const location = card.sourceCodeLocation?.startTag;
      if (!location) {
        return [];
      }
      const openingTag = $.html($(card).clone().empty()).replace(/<\/(?:figure|a)>$/, '');
      return [{ start: location.startOffset, end: location.endOffset, openingTag }];
    });
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    html = html.slice(0, replacement.start) + replacement.openingTag + html.slice(replacement.end);
  }
  return html;
}
