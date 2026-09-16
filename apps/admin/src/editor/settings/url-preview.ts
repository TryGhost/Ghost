/** The site URL without its scheme, then the slug, every part slash-terminated. */
export function formatUrlPreview(siteUrl: string, slug: string): string {
  const host = siteUrl.replace(/^[a-z][a-z\d+.-]*:\/\//i, '').replace(/\/+$/, '');
  return `${host}/${slug ? `${slug}/` : ''}`;
}
