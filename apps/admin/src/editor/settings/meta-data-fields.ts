/** The lengths the countdown recommends; neither one is a limit. */
export const META_TITLE_RECOMMENDED = 60;
export const META_DESCRIPTION_RECOMMENDED = 145;

const SERP_TITLE_LENGTH = 60;
const SERP_DESCRIPTION_LENGTH = 149;
const META_DESCRIPTION_PLACEHOLDER_LENGTH = 150;

const UNTITLED = '(Untitled)';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const SERP_DESCRIPTION_PLACEHOLDER =
  'Search engines will automatically show a custom preview of content related to the search term here if no custom meta description is set.';

/** Counted as symbols, so a multibyte character counts once. */
export function characterCount(value: string): number {
  return Array.from(value).length;
}

/** Ellipsis included in the limit, as the truncation this ports is. */
export function truncate(value: string, characterLimit: number): string {
  const limit = characterLimit - 3;
  const characters = Array.from(value);
  return characters.length > limit ? `${characters.slice(0, limit).join('')}...` : value;
}

/** The meta title, else the title the writer is looking at. */
export function seoTitle(metaTitle: string, title: string): string {
  return metaTitle || title || UNTITLED;
}

/** The meta description, else the excerpt the writer wrote. */
export function seoDescription(metaDescription: string, customExcerpt: string): string {
  return metaDescription || customExcerpt || '';
}

/** The canonical URL when there is one, else the post's own address. */
export function seoUrl({
  siteUrl,
  slug,
  canonicalUrl,
}: {
  siteUrl: string;
  slug: string;
  canonicalUrl: string;
}): string {
  const parts: string[] = [];

  if (canonicalUrl) {
    try {
      const url = new URL(canonicalUrl);
      parts.push(url.host, ...url.pathname.split('/').filter(Boolean));
    } catch {
      return '';
    }
  } else {
    const url = new URL(siteUrl);
    parts.push(url.host, ...url.pathname.split('/').filter(Boolean), slug);
  }

  return parts.join(' › ');
}

export function serpTitle(title: string): string {
  return truncate(title, SERP_TITLE_LENGTH);
}

export function serpDescription(description: string): string {
  return description
    ? truncate(description, SERP_DESCRIPTION_LENGTH)
    : SERP_DESCRIPTION_PLACEHOLDER;
}

export function metaDescriptionPlaceholder(description: string): string {
  return truncate(description, META_DESCRIPTION_PLACEHOLDER_LENGTH);
}

/** The date a result carries, as the search engines render it. */
export function serpDate(now: Date): string {
  const day = String(now.getDate()).padStart(2, '0');
  return `${day} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}
