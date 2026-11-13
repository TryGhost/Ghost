/**
 * Link pickers search `search-index/*` lists with these rules, so a term finds
 * the same content wherever a link is chosen.
 */

/** Whether `text` contains every word of `term`, in any order. A blank term matches. */
export function matchesWords(text: string, term: string): boolean {
  const haystack = text.toLowerCase();
  return term
    .toLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

// Unpublished content gets a /404/ URL (`notFoundUrl` in the server's
// lazy-url-service.ts), so it's never somewhere to link to
export function isLinkableUrl(url: string | null | undefined): url is string {
  return Boolean(url) && !url!.endsWith('/404/');
}

/** Whether a post or page can be linked to: published, with a URL that resolves. */
export function isLinkablePost<Entry extends { status?: string; url?: string | null }>(
  entry: Entry,
): entry is Entry & { url: string } {
  return entry.status === 'published' && isLinkableUrl(entry.url);
}
