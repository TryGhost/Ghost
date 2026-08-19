import {DirtyConfirmDialog} from '@tryghost/shade/patterns';
import {NavigationType, useBlocker, useLocation} from 'react-router';
import {matchRoutes} from '@tryghost/admin-x-framework';
import {settingsRouteChildren} from '@/settings/routes';
import {useConfirmUnload} from '@tryghost/admin-x-framework/hooks';
import {useGlobalDirtyState} from '@tryghost/shade/utils';
import {useEffect, useRef} from 'react';

// Sibling dialog routes that share a component (staff tabs, offers steps, design/theme)
// keep their state across navigation, so only leaving a dialog's route family counts.
const dialogFamily = (pathname: string): string => {
    if (!pathname.startsWith('/settings/')) {
        return pathname.startsWith('/settings') ? 'settings' : 'outside';
    }
    const relative = pathname.slice('/settings'.length);
    const leaf = matchRoutes(settingsRouteChildren, relative)?.at(-1)?.route;
    if (!leaf?.lazy) {
        return 'settings';
    }
    return relative.split('/')[1];
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
        return dialogFamily(currentLocation.pathname) !== dialogFamily(nextLocation.pathname);
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
