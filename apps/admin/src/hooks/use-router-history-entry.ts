import {useEffect, useRef} from 'react';
import {useLocation} from 'react-router';
import {z} from 'zod';

const historyStateSchema = z.looseObject({
    idx: z.number().int().nonnegative().optional()
}).nullable();

/**
 * Whether the current history entry was created by the router (it carries a
 * router index). `history.state` already belongs to the target entry by the
 * time a `useBlocker` callback runs, so this records it per location change.
 * The router can only undo a POP from an entry it created; from a native
 * hash-navigation entry it miscounts the delta and jumps or reloads instead,
 * so blockers should not block POPs while this is false.
 */
export function useIsOnRouterHistoryEntry(): React.RefObject<boolean> {
    const location = useLocation();
    const onRouterEntryRef = useRef(false);
    useEffect(() => {
        const historyState = historyStateSchema.safeParse(window.history.state);
        onRouterEntryRef.current = historyState.success && historyState.data?.idx !== undefined;
    }, [location]);
    return onRouterEntryRef;
}
