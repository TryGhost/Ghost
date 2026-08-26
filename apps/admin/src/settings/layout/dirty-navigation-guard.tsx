import {DirtyConfirmDialog} from '@tryghost/shade/patterns';
import {NavigationType, useBlocker, useLocation} from 'react-router';
import {useConfirmUnload} from '@tryghost/admin-x-framework/hooks';
import {useGlobalDirtyState} from '@tryghost/shade/utils';
import {useEffect, useRef} from 'react';
import {z} from 'zod';
import {dialogIdentity} from './dirty-navigation-guard-identity';

const historyStateSchema = z.looseObject({
    idx: z.number().int().nonnegative().optional()
}).nullable();

// Only history (back/forward) navigations are blocked: every in-app way out of a
// dirty settings dialog already runs its own dirty confirmation before navigating.
export const DirtyNavigationGuard: React.FC = () => {
    const {isDirty} = useGlobalDirtyState();
    const leaveConfirmedRef = useRef(false);
    const location = useLocation();
    // history.state already belongs to the target entry when the blocker runs, so
    // remember whether the entry being left was tracked by the router (it has an index).
    const onRouterEntryRef = useRef(false);
    useEffect(() => {
        const historyState = historyStateSchema.safeParse(window.history.state);
        onRouterEntryRef.current = historyState.success && historyState.data?.idx !== undefined;
    }, [location]);

    useConfirmUnload(isDirty);

    const blocker = useBlocker(({currentLocation, nextLocation, historyAction}) => {
        if (!isDirty || historyAction !== NavigationType.Pop) {
            return false;
        }
        // The router can only undo a POP from an entry it created; from a native
        // hash-navigation entry it would miscount the delta and reload instead.
        if (!onRouterEntryRef.current) {
            return false;
        }
        return dialogIdentity(currentLocation.pathname) !== dialogIdentity(nextLocation.pathname);
    });
    const isBlocked = blocker.state === 'blocked';

    return (
        <DirtyConfirmDialog
            open={isBlocked}
            onConfirm={() => {
                leaveConfirmedRef.current = true;
                blocker.proceed?.();
            }}
            onOpenChange={(open) => {
                if (open) {
                    return;
                }
                // Leave closes the dialog while the blocker still reads as blocked;
                // don't reset the navigation the user just confirmed.
                if (leaveConfirmedRef.current) {
                    leaveConfirmedRef.current = false;
                    return;
                }
                if (isBlocked) {
                    blocker.reset?.();
                }
            }}
        />
    );
};
