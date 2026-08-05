import nql from '@tryghost/nql';
import type {PostListItem} from '@/posts/list/hooks/use-posts-list';

/**
 * Copied verbatim from Ember's `updateFilteredPosts`. Not optional: without
 * them `tag:news` is looked up as a literal `tag` property, which a post does
 * not have, so every edited post fails to match and the entire selection
 * disappears from the list.
 */
const EXPANSIONS = [
    {
        key: 'primary_tag',
        replacement: 'tags.slug',
        expansion: 'posts_tags.sort_order:0+tags.visibility:public'
    },
    {
        key: 'primary_author',
        replacement: 'authors.slug',
        expansion: 'posts_authors.sort_order:0+authors.visibility:public'
    },
    {key: 'authors', replacement: 'authors.slug'},
    {key: 'author', replacement: 'authors.slug'},
    {key: 'tag', replacement: 'tags.slug'},
    {key: 'tags', replacement: 'tags.slug'}
];

interface PruneOptions {
    posts: PostListItem[];
    /** Ids the bulk action actually edited — Ember's `availableModels`. */
    editedIds: Set<string>;
    /** The list's own filter, which the edited posts must still match. */
    filter: string;
}

/**
 * Drops the rows a bulk edit has pushed out of the current filter.
 *
 * Ported from `updateFilteredPosts` in
 * `apps/ember-admin/app/components/posts-list/context-menu.js`.
 */
export function pruneNonMatchingPosts({posts, editedIds, filter}: PruneOptions): PostListItem[] {
    const query = nql(filter, {expansions: EXPANSIONS});

    try {
        // NQL parses lazily, so building the query proves nothing — probe it
        // once before trusting it with the list.
        query.queryJSON({});
    } catch {
        // By the time we prune, the server has already applied the edit. A
        // filter NQL can't parse is not a reason to empty the list — leave the
        // rows alone and let the next refetch sort them out.
        return posts;
    }

    return posts.filter((post) => {
        // Untouched rows are never removed, whatever the filter says about
        // them. Only what the action changed may disappear.
        if (!editedIds.has(post.id)) {
            return true;
        }

        return query.queryJSON(post);
    });
}
