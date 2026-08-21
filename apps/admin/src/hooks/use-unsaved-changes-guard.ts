import React from 'react';
import { NavigationType, useBlocker } from 'react-router';
import { isOnRouterHistoryEntry } from '@/hooks/use-router-history-entry';
import { useConfirmUnload, useLocation } from '@tryghost/admin-x-framework';
import { useHashLinkNavigationGuard } from '@/hooks/use-hash-link-navigation-guard';
import type { BlockerFunction } from 'react-router';

type BlockerFunctionArgs = Parameters<BlockerFunction>[0];

export interface UseUnsavedChangesGuardOptions {
  /** Guards in-router navigations and raw `<a href="#/…">` anchors while true. */
  when: boolean;
  /** `beforeunload` guard condition; defaults to `when`. */
  confirmUnloadWhen?: boolean;
  /** While true the discard dialog stays closed and a scheduled resume waits. */
  isSaving?: boolean;
  /**
   * Runs before the dirty check inside the screen's single router blocker
   * (react-router honors only one blocker at a time). Returning true blocks
   * the navigation and attributes it to the caller: the discard dialog stays
   * closed and the caller settles it via `interceptedNavigation`.
   */
  interceptNavigation?: (args: BlockerFunctionArgs) => boolean;
}

export interface UnsavedChangesGuard {
  /** A guarded navigation is currently blocked awaiting the discard dialog. */
  isBlocked: boolean;
  /** Wiring for Shade's `DirtyConfirmDialog`: `<DirtyConfirmDialog {...dialogProps} />`. */
  dialogProps: {
    open: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
  };
  /** Lets the caller's next programmatic navigation through the guard. */
  bypassNextNavigation: () => void;
  /**
   * If a navigation is currently blocked, schedules it to proceed once
   * `isSaving` settles and returns true — the caller should then skip its
   * own post-save navigation. Returns false when nothing was blocked.
   */
  resumeBlockedNavigationAfterSave: () => boolean;
  /** Navigation claimed by `interceptNavigation`, for the caller to settle. */
  interceptedNavigation: {
    isBlocked: boolean;
    proceed: () => void;
    reset: () => void;
  };
}

/**
 * Unsaved-changes guard for full-page admin screens. One hook owns the trio a
 * dirty screen needs — `useConfirmUnload` (tab close/reload), react-router's
 * `useBlocker` (in-router navigations), and `useHashLinkNavigationGuard`
 * (native hash anchors that reach the router as untracked POPs it cannot
 * block) — plus the proceed/reset choreography behind the discard dialog.
 *
 * Settings uses a different exit-point model (`useGlobalDirtyState` +
 * `useDirtyConfirmation`); this hook is for screens that own their routes.
 */
export function useUnsavedChangesGuard({
  when,
  confirmUnloadWhen,
  isSaving = false,
  interceptNavigation,
}: UseUnsavedChangesGuardOptions): UnsavedChangesGuard {
  const location = useLocation();
  // Lets the caller's own programmatic navigations (post-save redirects,
  // post-delete list returns) through the blocker.
  const bypassRef = React.useRef(false);
  // Whether a navigation is currently blocked. Kept in a ref because a save
  // can settle before React rerenders with the blocked state.
  const blockedNavigationRef = React.useRef(false);
  const resumeAfterSaveRef = React.useRef(false);
  // DirtyConfirmDialog's confirm action auto-closes the dialog, firing
  // onOpenChange(false) while the blocker still reads as blocked; without
  // this flag the close handler would reset the very navigation the user
  // just confirmed.
  const leaveConfirmedRef = React.useRef(false);
  const blockedByInterceptRef = React.useRef(false);
  const interceptRef = React.useRef(interceptNavigation);
  interceptRef.current = interceptNavigation;

  useConfirmUnload(confirmUnloadWhen ?? when);

  const blocker = useBlocker((args) => {
    // A POP can only be undone from a router-created entry; elsewhere the router
    // would miscount the delta and jump or reload, so let those through.
    if (args.historyAction === NavigationType.Pop && !isOnRouterHistoryEntry()) {
      return false;
    }
    if (bypassRef.current) {
      bypassRef.current = false;
      return false;
    }
    if (interceptRef.current?.(args)) {
      blockedByInterceptRef.current = true;
      return true;
    }
    blockedByInterceptRef.current = false;
    const shouldBlock = when && args.currentLocation.pathname !== args.nextLocation.pathname;
    if (shouldBlock) {
      blockedNavigationRef.current = true;
    }
    return shouldBlock;
  });
  const anchorGuard = useHashLinkNavigationGuard(when, () => {
    blockedNavigationRef.current = true;
  });

  const isBlockedByIntercept = blocker.state === 'blocked' && blockedByInterceptRef.current;
  const isBlocked =
    (blocker.state === 'blocked' && !blockedByInterceptRef.current) || anchorGuard.isBlocked;
  if (isBlocked) {
    blockedNavigationRef.current = true;
  }

  // One-shot state is scoped to the current route target.
  React.useEffect(() => {
    bypassRef.current = false;
    blockedNavigationRef.current = false;
    resumeAfterSaveRef.current = false;
  }, [location.pathname]);

  React.useEffect(() => {
    if (!resumeAfterSaveRef.current || isSaving || !isBlocked) {
      return;
    }
    resumeAfterSaveRef.current = false;
    blockedNavigationRef.current = false;
    if (anchorGuard.isBlocked) {
      anchorGuard.proceed();
    } else {
      blocker.proceed?.();
    }
  }, [isSaving, isBlocked, anchorGuard, blocker]);

  const bypassNextNavigation = React.useCallback(() => {
    bypassRef.current = true;
  }, []);

  const resumeBlockedNavigationAfterSave = React.useCallback(() => {
    if (!blockedNavigationRef.current) {
      return false;
    }
    resumeAfterSaveRef.current = true;
    return true;
  }, []);

  return {
    isBlocked,
    dialogProps: {
      open: isBlocked && !isSaving,
      onConfirm: () => {
        leaveConfirmedRef.current = true;
        blockedNavigationRef.current = false;
        resumeAfterSaveRef.current = false;
        if (anchorGuard.isBlocked) {
          anchorGuard.proceed();
        } else {
          blocker.proceed?.();
        }
      },
      onOpenChange: (open: boolean) => {
        if (open) {
          return;
        }
        if (leaveConfirmedRef.current) {
          leaveConfirmedRef.current = false;
          return;
        }
        if (isBlocked) {
          blockedNavigationRef.current = false;
          resumeAfterSaveRef.current = false;
          blocker.reset?.();
          anchorGuard.reset();
        }
      },
    },
    bypassNextNavigation,
    resumeBlockedNavigationAfterSave,
    interceptedNavigation: {
      isBlocked: isBlockedByIntercept,
      proceed: () => blocker.proceed?.(),
      reset: () => blocker.reset?.(),
    },
  };
}
