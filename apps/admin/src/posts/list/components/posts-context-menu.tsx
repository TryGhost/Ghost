import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger} from '@tryghost/shade/components';
import {IMPLEMENTED_POST_ACTIONS} from '@/posts/list/hooks/use-post-actions';
import type {PostContextMenuItem, PostContextMenuKey} from '@/posts/list/post-context-menu-items';
import {Fragment, memo, type ReactNode} from 'react';
import {LucideIcon} from '@tryghost/shade/utils';

/**
 * One icon per action. Kept here rather than on the item itself so
 * `post-context-menu-items.ts` stays a plain module with no React in it — it is
 * the piece the unit tests lean on hardest.
 *
 * Star, Tag and Lock match the icons Ember uses for the same three actions.
 */
const POST_MENU_ICONS: Record<PostContextMenuKey, typeof LucideIcon.Link> = {
    'copy-link': LucideIcon.Link,
    'copy-preview': LucideIcon.Link,
    'gift-link': LucideIcon.Gift,
    unpublish: LucideIcon.Undo2,
    unschedule: LucideIcon.CalendarX,
    feature: LucideIcon.Star,
    unfeature: LucideIcon.StarOff,
    'add-tag': LucideIcon.Tag,
    'change-access': LucideIcon.Lock,
    duplicate: LucideIcon.Copy,
    delete: LucideIcon.Trash2
};

interface PostsContextMenuProps {
    children: ReactNode;
    /**
     * Read when the menu opens rather than passed as a value: the items change
     * on every selection change, and a changing prop would defeat the row's
     * memo, which is the whole point of rendering the menu inside it.
     */
    getItems: () => PostContextMenuItem[];
    /** Only this row may offer a gift link, which is a single-post action. */
    showGiftLink: boolean;
    /**
     * Off for authors and contributors. Ember bails before intercepting the
     * event, letting the browser's own menu through; anything else would swap a
     * working native menu for an empty box.
     */
    enabled: boolean;
    onOpenChange: (open: boolean) => void;
    onAction: (key: PostContextMenuKey) => void | Promise<void>;
}

/**
 * The right-click menu, wrapping a row.
 *
 * Radix's ContextMenu replaces about 260 lines of Ember's `multi-list/item.js`
 * — hand-rolled long-press, native-context-menu suppression and ghost-click
 * suppression — all of which it handles itself.
 *
 * Which items appear is decided by `post-context-menu-items.ts` from the whole
 * selection, not from the row under the cursor.
 */
function PostsContextMenuComponent({
    children, getItems, showGiftLink, enabled, onOpenChange, onAction
}: PostsContextMenuProps) {

    // Ember bails before intercepting the event for roles that cannot act, so
    // they keep the browser's own menu rather than getting an empty box.
    //
    // Deliberately *not* also gating on `visible.length === 0`: with nothing
    // selected the list is empty until the right-click's transient selection
    // lands, so refusing to render the trigger would mean the menu could never
    // open at all. Ember has the same ordering — `openContextMenu` selects the
    // row first, then opens.
    if (!enabled) {
        return <>{children}</>;
    }

    const visible = showGiftLink ? getItems() : getItems().filter(item => item.key !== 'gift-link');

    return (
        <ContextMenu onOpenChange={onOpenChange}>
            <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
            <ContextMenuContent>
                {visible.map((item, index) => {
                    const Icon = POST_MENU_ICONS[item.key];

                    return (
                        // Fragment, not a div: a `role="menu"` may only contain
                        // menuitem, group and separator children.
                        <Fragment key={item.key}>
                            {/* Never above the first item. `separated` is
                                decided from the full list, but the gift link is
                                filtered out here — so whatever followed it
                                arrives carrying a separator with nothing above
                                it to separate from, and Radix draws a stray
                                rule across the top of the menu. */}
                            {index > 0 && item.separated && <ContextMenuSeparator />}
                            <ContextMenuItem
                                data-testid={`post-menu-${item.key}`}
                                disabled={!IMPLEMENTED_POST_ACTIONS.has(item.key)}
                                variant={item.destructive ? 'destructive' : undefined}
                                onSelect={() => {
                                    void onAction(item.key);
                                }}
                            >
                                <Icon />
                                {item.label}
                            </ContextMenuItem>
                        </Fragment>
                    );
                })}
            </ContextMenuContent>
        </ContextMenu>
    );
}

/**
 * Memoised, and it has to be: Radix's trigger builds fresh handlers and a fresh
 * `style` object on every render and clones them onto the child, so an
 * unmemoised wrapper defeats the row's own `memo` and re-renders every row (and
 * every hover card) on each selection change.
 */
export const PostsContextMenu = memo(PostsContextMenuComponent);
