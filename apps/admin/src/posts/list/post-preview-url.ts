/**
 * The shareable preview link for a post, ported from the `previewUrl` computed
 * in `apps/ember-admin/app/models/post.js`. `p` is Ghost's preview route
 * keyword.
 */
export function getPostPreviewUrl(post: {uuid?: string}, siteUrl: string): string {
    if (!post.uuid) {
        return '';
    }

    return `${siteUrl.replace(/\/$/, '')}/p/${post.uuid}/`;
}
