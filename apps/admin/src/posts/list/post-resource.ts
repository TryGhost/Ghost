/**
 * The posts and pages list screens are one implementation with two resources.
 * They differ only in the API path, the `type` filter options (pages have no
 * "Email only"), the editor link, and whether "Save as view" is offered — so
 * everything is parameterised by this rather than forked.
 */
export type PostResource = 'posts' | 'pages';

interface PostResourceCopy {
    /** Screen title. */
    title: string;
    /** Label and href for the primary "new" action in the page header. */
    newLabel: string;
    newHref: string;
}

const COPY: Record<PostResource, PostResourceCopy> = {
    posts: {
        title: 'Posts',
        newLabel: 'New post',
        newHref: '#/editor/post'
    },
    pages: {
        title: 'Pages',
        newLabel: 'New page',
        newHref: '#/editor/page'
    }
};

export function getPostResourceCopy(resource: PostResource): PostResourceCopy {
    return COPY[resource];
}
