import { DirtyConfirmDialog } from '@tryghost/shade/patterns';
import { NavigationType, useBlocker } from '@tryghost/admin-x-framework';
import { useConfirmUnload } from '@tryghost/admin-x-framework/hooks';
import { useGlobalDirtyState } from '@tryghost/shade/utils';
import { isOnRouterHistoryEntry } from '@/hooks/use-router-history-entry';
import { useRef } from 'react';
import { dialogIdentity } from './dirty-navigation-guard-identity';
import { settingsGroupForPath } from './settings-groups';
import {
  useActiveSettingsGroup,
  useSettingsGroupedNav,
} from '@/settings/hooks/use-settings-groups';

// History (back/forward) navigations are blocked: every in-app way out of a dirty
// settings dialog already runs its own dirty confirmation before navigating. With the
// grouped navigation, leaving a group from its page is blocked however it happens, as
// leaving Settings is, since its unsaved cards would be hidden.
export const DirtyNavigationGuard: React.FC = () => {
  const { isDirty } = useGlobalDirtyState();
  const grouped = useSettingsGroupedNav();
  const activeGroup = useActiveSettingsGroup();
  const leaveConfirmedRef = useRef(false);
  useConfirmUnload(isDirty);

  const blocker = useBlocker(({ currentLocation, nextLocation, historyAction }) => {
    if (!isDirty) {
      return false;
    }
    // From a dialog, its own confirmation already ran
    const leavesGroup =
      grouped &&
      dialogIdentity(currentLocation.pathname) === 'settings' &&
      (settingsGroupForPath(nextLocation.pathname) ?? activeGroup) !== activeGroup;
    if (historyAction !== NavigationType.Pop) {
      return leavesGroup;
    }
    if (!isOnRouterHistoryEntry()) {
      return false;
    }
    return (
      leavesGroup ||
      dialogIdentity(currentLocation.pathname) !== dialogIdentity(nextLocation.pathname)
    );
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
