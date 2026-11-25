/**
 * The shareable preview link for a post. `p` is Ghost's preview route
 * keyword.
 */
export function getPostPreviewUrl(post: { uuid?: string }, siteUrl: string): string {
  if (!post.uuid) {
    return '';
  }

  return `${siteUrl.replace(/\/$/, '')}/p/${post.uuid}/`;
}
