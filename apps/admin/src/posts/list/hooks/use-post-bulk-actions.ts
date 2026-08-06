import {getPostActionMessage, type PostActionMessageKey} from '@/posts/list/post-action-messages';
import {pruneNonMatchingPosts} from '@/posts/list/prune-non-matching-posts';
import {toast} from 'sonner';
import {useCallback, useState} from 'react';
import {useBulkDeletePages, useBulkEditPages} from '@tryghost/admin-x-framework/api/pages';
import {useBulkDeletePosts, useBulkEditPosts} from '@tryghost/admin-x-framework/api/posts';
import {useQueryClient} from '@tanstack/react-query';
import type {PostBulkAction} from '@tryghost/admin-x-framework/api/posts';
import type {PostContextMenuKey} from '@/posts/list/post-context-menu-items';
import type {PostListItem} from '@/posts/list/hooks/use-posts-list';
import type {PostResource} from '@/posts/list/post-resource';

/**
 * The bulk actions reachable from the right-click menu.
 *
 * Two things make this more than a mutation call.
 *
 * **The selection is snapshotted when the action starts.** Radix closes the
 * menu the moment an item is chosen, which clears a transient selection — so a
 * confirmation modal that read the live selection would find it empty by the
 * time the user pressed Delete. Ember solves this by freezing the selection
 * list for the whole modal lifetime; taking a copy up front is the same
 * guarantee with none of the state machine.
 *
 * **Edited rows are pruned client-side, not refetched.** That is what makes
 * unfeaturing a post while viewing `?type=featured` remove it immediately
 * without losing scroll position. See `prune-non-matching-posts.ts`.
 */

export interface BulkActionSnapshot {
    /** The NQL filter describing the selection — possibly inverted. */
    filter: string;
    /** The selected posts that are loaded, for pruning and for the modal title. */
    posts: PostListItem[];
    /** The selection count, which after Cmd+A is the server total. */
    count: number;
    /**
     * Ember's `isSingle` — one id selected *and not inverted*. Captured here
     * rather than read at modal-render time, because by then the transient
     * selection is already gone. Deriving it from `count === 1` instead is
     * actively dangerous: `getPostSelectionCount` floors at 1, so an inverted
     * selection over a stale total would name a single post in the modal while
     * the request carried a filter matching the whole site.
     */
    isSingle: boolean;
    /**
     * Whether the selection is inverted (Cmd+A). An inverted delete covers
     * rows that were never loaded, so the cached totals can't be decremented
     * by counting removed rows — what remains is the exclusions.
     */
    inverted: boolean;
    /**
     * The bucket filters the screen is currently showing. Ember iterates only
     * the three infinity models on screen; `setQueriesData` would otherwise
     * reach every cached list for the resource — including a Featured list
     * cached from an earlier visit — and prune it against the *current*
     * screen's filter, which is not its own.
     */
    bucketFilters: string[];
}

/**
 * Maps a menu item to the server's bulk action and its toast.
 *
 * Feature and unfeature have no message: Ember shows no notification for
 * either, because the star appearing or disappearing on the row is the
 * feedback. Both are also unconfirmed — they apply straight away.
 */
const BULK_ACTIONS: Partial<Record<PostContextMenuKey, {
    action: PostBulkAction['type'];
    message?: PostActionMessageKey;
}>> = {
    unpublish: {action: 'unpublish', message: 'unpublished'},
    unschedule: {action: 'unschedule', message: 'unscheduled'},
    feature: {action: 'feature'},
    unfeature: {action: 'unfeature'}
};

/**
 * How each action changes a row locally, so the pruner decides against the
 * post's *new* state. Ember pushes the same fields into its store for the same
 * reason — without it, unpublishing while viewing `?type=published` would leave
 * the rows in place until a refetch.
 */
function applyLocalEdit(post: PostListItem, key: PostContextMenuKey): PostListItem {
    switch (key) {
    case 'unpublish':
        return post.status === 'published' ? {...post, status: 'draft'} : post;
    case 'unschedule':
        return post.status === 'scheduled'
            ? {...post, status: 'draft', published_at: undefined}
            : post;
    case 'feature':
        return {...post, featured: true};
    case 'unfeature':
        return {...post, featured: false};
    default:
        return post;
    }
}

/**
 * The decoded `filter` param of a cached query's key. Keys are
 * `[dataType, url]` — see `createInfiniteQuery`.
 */
function getQueryKeyFilter(queryKey: readonly unknown[]): string | null {
    const url = queryKey[1];

    if (typeof url !== 'string') {
        return null;
    }

    try {
        return new URL(url, window.location.origin).searchParams.get('filter');
    } catch {
        // Matching nothing is safer than patching a list this action is not
        // about.
        return null;
    }
}

interface UsePostBulkActionsOptions {
    resource: PostResource;
    /**
     * Called after a delete. Ember force-clears the whole selection here,
     * because every selected row is gone.
     */
    onDeleted?: () => void;
    /**
     * Called after an edit, with the ids still present in the list. Ember calls
     * `clearUnavailableItems` — it keeps the selection on the rows that are
     * still visible, so a second action can follow the first.
     */
    onEdited?: (remainingIds: Set<string>) => void;
}

export function usePostBulkActions({resource, onDeleted, onEdited}: UsePostBulkActionsOptions) {
    const [isRunning, setIsRunning] = useState(false);
    const queryClient = useQueryClient();

    /*
     * Invalidation goes through TanStack's `invalidateQueries` directly, never
     * the framework's `onInvalidate`: `PostsResponseType` has no entry in the
     * bridge's `emberDataTypeMapping`, so that call throws outright — and the
     * mapping it would need resolves to `store.unloadAll('post')`, which would
     * drop the record out from under an editor the user may have open.
     */

    // Called unconditionally and picked by resource — hooks can't be branched.
    const bulkEditPosts = useBulkEditPosts();
    const bulkEditPages = useBulkEditPages();
    const bulkDeletePosts = useBulkDeletePosts();
    const bulkDeletePages = useBulkDeletePages();

    const isPages = resource === 'pages';
    const dataType = isPages ? 'PagesResponseType' : 'PostsResponseType';

    /**
     * Removes the given ids from every cached page of the on-screen bucket
     * lists, and prunes any edited row that no longer matches its own bucket's
     * filter. Patching rather than refetching is what preserves scroll
     * position on a long list.
     */
    const patchCaches = useCallback((
        snapshot: BulkActionSnapshot,
        action: PostContextMenuKey
    ): Set<string> => {
        const editedIds = new Set(snapshot.posts.map(post => post.id));
        const isDelete = action === 'delete';
        const remaining = new Set<string>();

        for (const bucketFilter of snapshot.bucketFilters) {
            queryClient.setQueriesData<{
                pageParams?: unknown[];
                pages?: {
                    posts?: PostListItem[];
                    pages?: PostListItem[];
                    meta?: {pagination: {total?: number}};
                }[];
            }>(
                {
                    queryKey: [dataType],
                    // Exact match on the key's decoded `filter` param. A
                    // substring test would also patch lists this filter merely
                    // prefixes (`status:draft` vs `status:draft+featured:true`)
                    // and prune them against a filter that is not their own.
                    predicate: query => getQueryKeyFilter(query.queryKey) === bucketFilter
                },
                (cached) => {
                    // `pageParams` rather than `pages`: a non-infinite *pages*
                    // response is literally `{pages: Page[]}`, so testing for
                    // `pages` would treat each Page as an infinite page and
                    // rewrite the record to nothing. Only InfiniteData has
                    // `pageParams`.
                    if (!Array.isArray(cached?.pageParams) || !cached.pages) {
                        return cached;
                    }

                    let removed = 0;
                    let keptCount = 0;
                    const pages = cached.pages.map((page) => {
                        const key = isPages ? 'pages' : 'posts';
                        const rows = page[key] ?? [];
                        let kept: PostListItem[];

                        if (isDelete) {
                            kept = rows.filter(row => !editedIds.has(row.id));
                        } else {
                            // The edit is applied to the cached rows *first*,
                            // so the pruner sees the post as it now is.
                            // Applying it to the snapshot's copies instead
                            // would leave the cache holding the old state and
                            // prune nothing.
                            const edited = rows.map(row => (
                                editedIds.has(row.id) ? applyLocalEdit(row, action) : row
                            ));

                            // Pruned against the bucket's own filter, not the
                            // list-wide one: on the unfiltered list an
                            // unpublished row still matches the every-status
                            // filter but must leave the published bucket.
                            kept = pruneNonMatchingPosts({
                                posts: edited,
                                editedIds,
                                filter: bucketFilter
                            });

                            kept.forEach((row) => {
                                if (editedIds.has(row.id)) {
                                    remaining.add(row.id);
                                }
                            });
                        }

                        removed += rows.length - kept.length;
                        keptCount += kept.length;

                        return {...page, [key]: kept};
                    });

                    // Totals only move on delete — an edited row that left this
                    // bucket still exists, so subtracting it would shrink the
                    // list-wide count the selection reads. Inverted deletes
                    // covered rows never loaded, so what's left in the bucket
                    // is exactly the exclusions still cached.
                    if (!isDelete || (removed === 0 && !snapshot.inverted)) {
                        return {...cached, pages};
                    }

                    // The hooks' `returnData` reads `meta` off the last page;
                    // keep every page consistent so the total tracks the rows.
                    return {
                        ...cached,
                        pages: pages.map(page => (typeof page.meta?.pagination?.total === 'number' ? {
                            ...page,
                            meta: {
                                ...page.meta,
                                pagination: {
                                    ...page.meta.pagination,
                                    total: snapshot.inverted
                                        ? keptCount
                                        : Math.max(0, page.meta.pagination.total - removed)
                                }
                            }
                        } : page))
                    };
                }
            );
        }

        return remaining;
    }, [queryClient, dataType, isPages]);

    /**
     * The two actions that carry a payload. Both refetch rather than prune.
     *
     * Ember prunes here too, but only after re-fetching every edited post in
     * batches of 50 — the new tag or visibility has to be in the store before
     * the filter can be evaluated against it. We cannot shortcut that with a
     * local edit: a *newly created* tag's slug is decided server-side, so
     * pruning against `tag:<slug>` locally would be guesswork. Refetching the
     * list is the same end state for one request instead of N, and costs only
     * the scroll position.
     */
    const runWithPayload = useCallback(async (
        key: 'add-tag' | 'change-access',
        snapshot: BulkActionSnapshot,
        meta: {tags: {id?: string; name: string; slug?: string}[]}
            | {visibility: string; tiers?: {id: string}[]}
    ) => {
        setIsRunning(true);

        try {
            const action = (key === 'add-tag'
                ? {type: 'addTag', meta}
                : {type: 'access', meta}) as PostBulkAction;

            if (isPages) {
                await bulkEditPages.mutateAsync({filter: snapshot.filter, action});
            } else {
                await bulkEditPosts.mutateAsync({filter: snapshot.filter, action});
            }

            if (key === 'change-access') {
                toast.success(getPostActionMessage('accessUpdated', {
                    count: snapshot.count, resource, isSingle: snapshot.isSingle
                }));
            } else {
                const tagCount = 'tags' in meta ? meta.tags.length : 1;

                toast.success(getPostActionMessage(tagCount > 1 ? 'tagsAdded' : 'tagAdded', {
                    count: snapshot.count, resource, isSingle: snapshot.isSingle
                }));
            }

            // Close *before* refetching, not after. `invalidateQueries`
            // resolves only once every active query has refetched, so awaiting
            // it here leaves the modal open — and a modal open means
            // `body { pointer-events: none }`, so nothing on the page is
            // clickable until it resolves. If one query is slow or never
            // settles, the whole admin appears frozen.
            onEdited?.(new Set(snapshot.posts.map(post => post.id)));

            void queryClient.invalidateQueries({queryKey: [dataType]});
        } catch (error) {
            toast.error(error instanceof Error && error.message
                ? error.message
                : 'That action could not be completed.');
        } finally {
            setIsRunning(false);
        }
    }, [isPages, resource, onEdited, queryClient, dataType, bulkEditPosts, bulkEditPages]);

    const run = useCallback(async (key: PostContextMenuKey, snapshot: BulkActionSnapshot) => {
        setIsRunning(true);

        try {
            if (key === 'delete') {
                if (isPages) {
                    await bulkDeletePages.mutateAsync({filter: snapshot.filter});
                } else {
                    await bulkDeletePosts.mutateAsync({filter: snapshot.filter});
                }

                patchCaches(snapshot, 'delete');
                // Other cached lists for the resource (saved views, search
                // index, analytics screens) still hold the rows; mark them
                // stale without refetching the just-patched active queries.
                void queryClient.invalidateQueries({queryKey: [dataType], refetchType: 'none'});
                toast.success(getPostActionMessage('deleted', {
                    count: snapshot.count, resource, isSingle: snapshot.isSingle
                }));
                onDeleted?.();

                return;
            }

            const bulk = BULK_ACTIONS[key];

            if (!bulk) {
                return;
            }

            const payload = {filter: snapshot.filter, action: {type: bulk.action} as PostBulkAction};

            if (isPages) {
                await bulkEditPages.mutateAsync(payload);
            } else {
                await bulkEditPosts.mutateAsync(payload);
            }

            if (bulk.message) {
                toast.success(getPostActionMessage(bulk.message, {
                    count: snapshot.count, resource, isSingle: snapshot.isSingle
                }));
            }

            const remaining = patchCaches(snapshot, key);

            void queryClient.invalidateQueries({queryKey: [dataType], refetchType: 'none'});

            // The rows the edit pushed out of the list are no longer selectable,
            // but the ones still on screen stay selected — matching Ember's
            // `clearUnavailableItems` rather than a full clear.
            onEdited?.(remaining);
        } catch (error) {
            // Without this the rejection is unhandled and the user sees
            // nothing: the modal simply sits there. Ember surfaces the API
            // error through `showAPIError`.
            toast.error(error instanceof Error && error.message
                ? error.message
                : 'That action could not be completed.');
        } finally {
            setIsRunning(false);
        }
    }, [
        isPages, resource, onDeleted, onEdited, patchCaches, dataType, queryClient,
        bulkEditPosts, bulkEditPages, bulkDeletePosts, bulkDeletePages
    ]);

    return {run, runWithPayload, isRunning};
}
