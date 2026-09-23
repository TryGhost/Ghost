import { load } from 'cheerio';

/** Parent identity belongs to the current response, never saved authoring props. */
export function withAddonPostContext(html: string | null | undefined, postId: unknown) {
  if (typeof html !== 'string' || !html.includes('kg-addon-card')) {
    return html;
  }
  const $ = load(html, { sourceCodeLocationInfo: true }, false);
  const cards = $('figure.kg-addon-card[data-addon-id]');
  cards.removeAttr('data-addon-post-id');
  if (typeof postId === 'string' && /^[\da-f]{24}$/i.test(postId)) {
    cards.attr('data-addon-post-id', postId);
  }
  // Only replace opening tags. Serializing the post would also rewrite unrelated
  // HTML, including raw text, entities, iframe srcdoc and portable fallbacks.
  const replacements = cards.toArray().flatMap((card) => {
    const location = card.sourceCodeLocation?.startTag;
    if (!location) {
      return [];
    }
    const openingTag = $.html($(card).clone().empty()).replace(/<\/figure>$/, '');
    return [{ start: location.startOffset, end: location.endOffset, openingTag }];
  });
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    html = html.slice(0, replacement.start) + replacement.openingTag + html.slice(replacement.end);
  }
  return html;
}
