/** The site URL without its scheme, then the optional prefix and the slug, every part slash-terminated. */
export function formatUrlPreview(siteUrl: string, slug: string, prefix?: string): string {
  const host = siteUrl.replace(/^[a-z][a-z\d+.-]*:\/\//i, '').replace(/\/+$/, '');
  return `${host}/${prefix ? `${prefix}/` : ''}${slug ? `${slug}/` : ''}`;
}
