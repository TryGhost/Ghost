import {getPostSelectionFilter} from '@/posts/list/post-selection-filter';
import {initialPostSelection, isPostSelected, postSelectionReducer} from '@/posts/list/post-selection-state';
import {useCallback, useEffect, useMemo, useReducer, useRef, useState} from 'react';
import type {MouseEvent as ReactMouseEvent} from 'react';

/**
 * Modifier-click selection for the posts list, ported from
 * `apps/ember-admin/app/components/multi-list/list.js` and `item.js`.
 *
 * There are no checkboxes: cmd-click, shift-click, Cmd+A, Escape, and an
 * unmodified click anywhere clears. That means window-level handlers, which is
 * where most of the care here goes.
 */

interface UsePostSelectionOptions {
    /** The rows currently on screen, in display order — shift ranges over this. */
    orderedIds: string[];
    /** The filter bounding an inverted selection. */
    allFilter: string;
    /** Off for authors and contributors, who cannot bulk-edit anything. */
    enabled: boolean;
}

/**
 * A modifier-click leaves a text selection behind across the rows it dragged
 * over, which looks broken. Ember clears it the same way.
 */
function clearTextSelection() {
    const selection = window.getSelection();

    if (!selection) {
        return;
    }

    if (selection.empty) {
        selection.empty();
    } else if (selection.removeAllRanges) {
        selection.removeAllRanges();
    }
}

export function usePostSelection({orderedIds, allFilter, enabled}: UsePostSelectionOptions) {
    const [state, dispatch] = useReducer(postSelectionReducer, initialPostSelection);

    /**
     * Whether a modifier is being held right now — Ember's `actionKeyPressed`.
     * It puts the list into "select mode": the cursor stops being a pointer and
     * the rows stop behaving like links, so what a click is about to do is
     * visible before the click happens.
     *
     * Derived from the event's own modifier flags rather than tracked per key.
     * `keydown` and `keyup` both report the state *after* the event, so one
     * boolean is enough where Ember keeps three.
     */
    const [modifierHeld, setModifierHeld] = useState(false);

    // Read by the window handlers, which are registered once. Keeping these in
    // a ref rather than in the dependency list means the listeners aren't torn
    // down and rebuilt on every keystroke in the filter bar.
    const latest = useRef({orderedIds, enabled});
    latest.current = {orderedIds, enabled};

    /**
     * Ember clears the selection on every model refresh — `clearSelection()` in
     * `PostsRoute#setupController`, reached whenever one of the five
     * `refreshModel: true` query params changes.
     *
     * This is not tidiness. After Cmd+A the selection is *inverted* and bounded
     * by `allFilter`, which is rebuilt from the URL: select all drafts, drop
     * the type filter, and the very same selection now means "every post on the
     * site". Carrying it across would hand that to a bulk delete.
     */
    const previousFilter = useRef(allFilter);

    useEffect(() => {
        if (previousFilter.current !== allFilter) {
            previousFilter.current = allFilter;
            dispatch({type: 'clear'});
        }
    }, [allFilter]);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (!latest.current.enabled) {
                return;
            }

            // Cmd+A belongs to whatever is being typed into. Ember has the
            // same flaw against its power-select search boxes, but the
            // save-view popover is a React-only surface, so this would be a
            // new way to lose what you were typing.
            const target = event.target as HTMLElement | null;
            const isTyping = target instanceof HTMLInputElement
                || target instanceof HTMLTextAreaElement
                || target?.isContentEditable === true;

            if (isTyping) {
                return;
            }

            if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key === 'a') {
                dispatch({type: 'selectAll'});
                // Otherwise the browser selects every word on the page too.
                event.preventDefault();
                return;
            }

            if (event.key === 'Escape') {
                dispatch({type: 'clear'});
            }
        }

        function syncModifier(event: KeyboardEvent | MouseEvent) {
            setModifierHeld(event.metaKey || event.ctrlKey || event.shiftKey);
        }

        // A keyup that never arrives — Cmd+Tab away mid-chord — would otherwise
        // leave the list stuck in select mode with nothing clickable.
        function onWindowBlur() {
            setModifierHeld(false);
        }

        function onWindowClick(event: MouseEvent) {
            if (!latest.current.enabled) {
                return;
            }

            // A click inside an open menu or dialog is not "clicking away" —
            // without this, confirming "Delete 12 posts?" would clear the very
            // selection the confirm handler is about to read.
            //
            // `alertdialog` is listed separately because Radix's AlertDialog —
            // which is exactly what a destructive confirmation uses — renders
            // that role and *not* `dialog`, so matching only `dialog` would
            // miss the one case that matters most.
            //
            // Ember has no target check at all here; it freezes the selection
            // list while its menu is open instead. Scoping by role is the same
            // guarantee without the freeze/unfreeze machinery.
            const target = event.target as HTMLElement | null;

            if (target?.closest('[role="menu"], [role="dialog"], [role="alertdialog"], [role="listbox"]')) {
                return;
            }

            if (!event.metaKey && !event.ctrlKey) {
                dispatch({type: 'clear'});
            }
        }

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keydown', syncModifier);
        window.addEventListener('keyup', syncModifier);
        window.addEventListener('click', onWindowClick);
        window.addEventListener('click', syncModifier);
        window.addEventListener('blur', onWindowBlur);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keydown', syncModifier);
            window.removeEventListener('keyup', syncModifier);
            window.removeEventListener('click', onWindowClick);
            window.removeEventListener('click', syncModifier);
            window.removeEventListener('blur', onWindowBlur);
        };
    }, []);

    /**
     * Bound to each row's `mousedown` in the **capture** phase. Mousedown
     * rather than click because only mousedown can `preventDefault()` the
     * browser's own text selection; capture because it has to win against the
     * row's link before the browser starts navigating.
     */
    const onRowMouseDown = useCallback((event: ReactMouseEvent, id: string) => {
        if (!latest.current.enabled) {
            return;
        }

        // The metric links and the trailing action button opt out — a
        // cmd-click there should follow the link, not select the row.
        if ((event.target as HTMLElement).closest('[data-ignore-select]')) {
            return;
        }

        const useCtrl = event.ctrlKey || event.metaKey;

        if (useCtrl) {
            dispatch({type: 'toggle', id});
        } else if (event.shiftKey) {
            dispatch({type: 'shift', id, orderedIds: latest.current.orderedIds});
        } else {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        clearTextSelection();
    }, []);

    /**
     * The matching capture-phase `click`. Its whole job is to stop a modifier
     * click from navigating, and to stop it reaching the window handler that
     * would immediately clear what was just selected.
     */
    const onRowClick = useCallback((event: ReactMouseEvent) => {
        if (!latest.current.enabled) {
            return;
        }

        if ((event.target as HTMLElement).closest('[data-ignore-select]')) {
            return;
        }

        if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        clearTextSelection();
    }, []);

    /**
     * Radix owns the menu's open state, so this is where Ember's
     * freeze/unfreeze pair lands: opening on an unselected row selects just
     * that row transiently, and closing drops it again.
     */
    const onContextMenuOpenChange = useCallback((open: boolean, id: string) => {
        if (!latest.current.enabled) {
            return;
        }

        dispatch(open ? {type: 'contextMenu', id} : {type: 'closeContextMenu'});
    }, []);

    /**
     * One stable handler per row id. An inline `open => handler(open, id)` in
     * the list would be a new function on every render, which defeats the
     * memoised context menu and with it the memoised row.
     *
     * Not yet sufficient: ~85ms per selection change at 103 rows (measured
     * Aug 2026), attributed to the per-row menu wrapper. Follow-up pending.
     */
    const openHandlers = useRef(new Map<string, (open: boolean) => void>());

    const getContextMenuOpenHandler = useCallback((id: string) => {
        const existing = openHandlers.current.get(id);

        if (existing) {
            return existing;
        }

        const handler = (open: boolean) => {
            onContextMenuOpenChange(open, id);
        };

        openHandlers.current.set(id, handler);

        return handler;
    }, [onContextMenuOpenChange]);

    /** Ember's `clearUnavailableItems`, called after a bulk edit prunes rows. */
    const keepOnly = useCallback((ids: Set<string>) => {
        dispatch({type: 'keepOnly', ids});
    }, []);

    const filter = useMemo(() => getPostSelectionFilter(state, allFilter), [state, allFilter]);

    return {
        state,
        filter,
        modifierHeld: enabled && modifierHeld,
        isSelected: useCallback((id: string) => enabled && isPostSelected(state, id), [enabled, state]),
        clear: useCallback(() => dispatch({type: 'clear'}), []),
        keepOnly,
        onRowMouseDown,
        onRowClick,
        getContextMenuOpenHandler,
        enabled
    };
}
