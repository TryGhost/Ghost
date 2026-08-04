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
    /** Lowercase plural, for sentences like "No posts match the current filter". */
    plural: string;
    /** Label and href for the primary "new" action in the page header. */
    newLabel: string;
    newHref: string;
    /**
     * Cold-start empty state. Wording is verbatim from the Ember templates,
     * terminal full stops included — Ember shows a heading and a button with
     * no supporting description.
     */
    emptyTitle: string;
    emptyAction: string;
}

const COPY: Record<PostResource, PostResourceCopy> = {
    posts: {
        title: 'Posts',
        plural: 'posts',
        newLabel: 'New post',
        newHref: '#/editor/post',
        emptyTitle: 'Start creating content.',
        emptyAction: 'Write a new post'
    },
    pages: {
        title: 'Pages',
        plural: 'pages',
        newLabel: 'New page',
        newHref: '#/editor/page',
        emptyTitle: 'Tell the world about yourself.',
        emptyAction: 'Create a new page'
    }
};

export function getPostResourceCopy(resource: PostResource): PostResourceCopy {
    return COPY[resource];
}
