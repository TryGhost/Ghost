import {DirtyConfirmDialog} from '@tryghost/shade/patterns';
import {NavigationType, useBlocker, useLocation} from 'react-router';
import {matchRoutes} from '@tryghost/admin-x-framework';
import {settingsRouteChildren} from '@/settings/routes';
import {useConfirmUnload} from '@tryghost/admin-x-framework/hooks';
import {useGlobalDirtyState} from '@tryghost/shade/utils';
import {useEffect, useRef} from 'react';

// Which dialog a settings path renders: routes sharing a `handle.dialogGroup` are one
// dialog instance (tabs/steps), any other leaf route is its own, and section roots
// or anything outside settings count as leaving every dialog.
const dialogIdentity = (pathname: string): string => {
    if (!pathname.startsWith('/settings')) {
        return 'outside';
    }
    const leaf = matchRoutes(settingsRouteChildren, pathname.slice('/settings'.length) || '/')?.at(-1)?.route;
    if (!leaf?.lazy) {
        return 'settings';
    }
    const group = (leaf.handle as {dialogGroup?: string} | undefined)?.dialogGroup;
    return group ? `group:${group}` : `route:${leaf.path ?? ''}`;
};

// Only history (back/forward) navigations are blocked: every in-app way out of a
// dirty settings dialog already runs its own dirty confirmation before navigating.
export const DirtyNavigationGuard: React.FC = () => {
    const {isDirty} = useGlobalDirtyState();
    const leaveConfirmedRef = useRef(false);
    const location = useLocation();
    // history.state already belongs to the target entry when the blocker runs, so
    // remember whether the entry being left was created by the router (it has a key).
    const onRouterEntryRef = useRef(false);
    useEffect(() => {
        onRouterEntryRef.current = typeof (window.history.state as {key?: unknown} | null)?.key === 'string';
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
