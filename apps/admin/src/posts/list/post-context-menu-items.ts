import type {PostListItem} from '@/posts/list/hooks/use-posts-list';
import type {PostResource} from '@/posts/list/post-resource';

/**
 * Which items the right-click menu shows for the current selection.
 *
 * Ported from `context-menu.hbs` and the predicates at the bottom of
 * `apps/ember-admin/app/components/posts-list/context-menu.js`.
 *
 * The rule worth holding on to: **the menu describes the whole selection**, not
 * the row that was right-clicked. Ember's status predicates are all "any"
 * rather than "every", so one published post among five drafts is enough to
 * offer Unpublish — the action then applies to whichever of the selection it
 * can apply to. Getting this backwards would quietly hide actions from mixed
 * selections, which is most of them.
 */

export type PostContextMenuKey =
    | 'copy-link'
    | 'copy-preview'
    | 'gift-link'
    | 'unpublish'
    | 'unschedule'
    | 'feature'
    | 'unfeature'
    | 'add-tag'
    | 'change-access'
    | 'duplicate'
    | 'delete';

export interface PostContextMenuItem {
    key: PostContextMenuKey;
    label: string;
    /** Whether a separator sits above this item. */
    separated: boolean;
    destructive?: boolean;
}

export interface PostContextMenuInputs {
    /**
     * The selected posts that are actually loaded — Ember's `availableModels`.
     * An inverted selection can cover rows that were never fetched, so the menu
     * necessarily reasons about the ones in memory.
     */
    posts: PostListItem[];
    /** Unused by the item list today — every label Ember emits here is
     * hardcoded to "post" — but kept so callers pass a complete description of
     * the selection, and for the Phase 8 modals. */
    resource: PostResource;
    /** Owner or Administrator. Only they may delete. */
    isAdmin: boolean;
    membersEnabled: boolean;
    /** Decided by the shared gift-link rules, which need the current user. */
    canCopyGiftLink: boolean;
}

/** `canCopySelection` — the single-post actions. */
function isSingle(posts: PostListItem[]): boolean {
    return posts.length === 1;
}

function hasStatus(posts: PostListItem[], status: string): boolean {
    return posts.some(post => post.status === status);
}

/**
 * `shouldFeatureSelection`. The menu offers whichever action would affect the
 * majority, and the comparison is inclusive — at exactly half featured, it
 * still offers Feature.
 */
function shouldFeature(posts: PostListItem[]): boolean {
    const featured = posts.filter(post => post.featured).length;

    return featured <= posts.length / 2;
}

export function getPostContextMenuItems(inputs: PostContextMenuInputs): PostContextMenuItem[] {
    const {posts, isAdmin, membersEnabled, canCopyGiftLink} = inputs;

    if (posts.length === 0) {
        return [];
    }

    const items: PostContextMenuItem[] = [];
    const add = (key: PostContextMenuKey, label: string, extra: Partial<PostContextMenuItem> = {}) => {
        items.push({key, label, separated: false, ...extra});
    };

    // The template makes these two branches exclusive: a selection containing
    // anything published offers the public link, and never the preview link.
    if (hasStatus(posts, 'published')) {
        if (isSingle(posts)) {
            // "post" on both resources, as Ember hardcodes it — matching the
            // "Post link copied" toast, which is hardcoded the same way.
            add('copy-link', 'Copy link to post');
        }

        if (canCopyGiftLink) {
            add('gift-link', 'Share as a gift');
        }

        // Ember separates Unpublish from the gift link above it, and only
        // then — but whether the gift link renders is decided per row, after
        // this list is built, so the menu draws that rule from adjacency.
        add('unpublish', 'Unpublish');
    } else {
        if (isSingle(posts)) {
            add('copy-preview', 'Copy preview link');
        }

        if (hasStatus(posts, 'scheduled')) {
            add('unschedule', 'Unschedule');
        }
    }

    // A sent post can no longer be featured, so a selection of only sent posts
    // offers neither action.
    if (posts.some(post => post.status !== 'sent')) {
        if (shouldFeature(posts)) {
            add('feature', 'Feature');
        } else {
            add('unfeature', 'Unfeature');
        }
    }

    // The only item with no condition on it at all.
    add('add-tag', 'Add a tag');

    if (membersEnabled) {
        add('change-access', 'Change access');
    }

    if (isSingle(posts)) {
        add('duplicate', 'Duplicate');
    }

    // Set apart from the rest: it is the one item here that cannot be undone.
    if (isAdmin) {
        add('delete', 'Delete', {destructive: true, separated: true});
    }

    return items;
}
