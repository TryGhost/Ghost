import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import type { PostType } from '@/editor/card-config';
import type { SaveEngineState } from '@/editor/engine/save-engine';
import {
  hasUnsavedWork,
  isCreatedIdUrlSwap,
  LEAVE_DECISION_DEADLINE_MS,
  leaveDecisionWithin,
} from './leave-guard';
import { useEditorSessionKey, useMarkEditorSessionCreated } from './session-key';
import type { EditorSessionHandle } from './use-editor-session';

export interface EditorLeaveGuard {
  /** Wiring for Shade's `DirtyConfirmDialog`. */
  dialogProps: {
    open: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
  };
}

/**
 * Stops a navigation from losing what the writer typed. In-router navigations,
 * native `<a href="#/…">` anchors and history pops (Back, Forward, a hash change
 * made outside the router) are put to the save engine, which finishes or saves
 * whatever is outstanding and answers `proceed` (leaving loses nothing) or
 * `confirm` (ask first); a held pop keeps the editor's URL until then. A tab
 * close or reload gets the browser's own prompt. The session's own URL replace
 * after a create is not an exit and passes silently.
 */
export function useEditorLeaveGuard(
  session: EditorSessionHandle,
  postType: PostType,
): EditorLeaveGuard {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionKey = useEditorSessionKey();
  const isDirty = session.isDirty();
  const hasWork = hasUnsavedWork(session.state, isDirty);
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);

  const guard = useUnsavedChangesGuard({
    when: hasWork,
    confirmUnloadWhen: hasWork,
    interceptNavigation: ({ currentLocation, nextLocation }) =>
      isCreatedIdUrlSwap(currentLocation, nextLocation, postType, sessionKey),
    guardHistoryPops: true,
  });

  const guardRef = useRef(guard);
  guardRef.current = guard;
  const stateRef = useRef(session.state);
  stateRef.current = session.state;
  // The engine state a leave last ran out of time in: another leave in that state asks at once.
  const lateStateRef = useRef<SaveEngineState | null>(null);
  // Stays set while an accepted exit is transitioning. React Router does not
  // consult blockers again in its `proceeding` state, so the deferred ID swap
  // must not race and replace that navigation either.
  const isLeavingRef = useRef(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // An accepted exit that lands without unmounting the editor is over. Runs before the ID
  // swap below, which waits for it.
  useEffect(() => {
    if (!isLeavingRef.current) {
      return;
    }
    isLeavingRef.current = false;
    setIsConfirmingLeave(false);
  }, [location]);

  const isUrlSwapBlocked = guard.interceptedNavigation.isBlocked;

  // Wait for a real exit to settle before replacing a new post's URL. React
  // Router owns one blocker target, so starting this replace while an exit is
  // blocked would overwrite the writer's original destination.
  const createdId = session.createdId;
  const markSessionCreated = useMarkEditorSessionCreated();
  useEffect(() => {
    if (createdId) {
      markSessionCreated();
    }
  }, [createdId, markSessionCreated]);
  const { hasBlockedNavigation } = guard;
  useEffect(() => {
    if (!createdId || hasBlockedNavigation() || isUrlSwapBlocked || isLeavingRef.current) {
      return;
    }
    const target = `/editor/${postType}/${createdId}`;
    if (location.pathname === target) {
      return;
    }
    navigate(target, {
      replace: true,
      state: { editorSession: sessionKey },
    });
  }, [
    createdId,
    guard.isBlocked,
    hasBlockedNavigation,
    isUrlSwapBlocked,
    location.pathname,
    navigate,
    postType,
    sessionKey,
  ]);

  useEffect(() => {
    if (isUrlSwapBlocked) {
      guardRef.current.interceptedNavigation.proceed();
    }
  }, [isUrlSwapBlocked]);

  const { isBlocked } = guard;
  const { leaveRequested } = session;
  const isDecidingRef = useRef(false);
  useEffect(() => {
    if (!isBlocked) {
      isDecidingRef.current = false;
      if (!isLeavingRef.current) {
        setIsConfirmingLeave(false);
      }
      return;
    }
    if (isDecidingRef.current) {
      return;
    }
    isDecidingRef.current = true;
    void leaveDecisionWithin(leaveRequested(), {
      ms: stateRef.current === lateStateRef.current ? 0 : LEAVE_DECISION_DEADLINE_MS,
      isSigningIn: () => stateRef.current.kind === 'reauth-pending',
      onLate: () => {
        lateStateRef.current = stateRef.current;
      },
    }).then((decision) => {
      // An exit the router dropped meanwhile has nothing left for a dialog to settle.
      if (!isMountedRef.current || !guardRef.current.isBlocked) {
        return;
      }
      if (decision === 'confirm') {
        setIsConfirmingLeave(true);
        return;
      }
      isLeavingRef.current = true;
      guardRef.current.dialogProps.onConfirm();
    });
  }, [isBlocked, leaveRequested]);

  // Reading the hook's own `open` would paint a dialog on every blocked commit.
  const settle = guard.dialogProps;

  return {
    dialogProps: {
      open: isConfirmingLeave,
      onConfirm: () => {
        if (isLeavingRef.current) {
          return;
        }
        isLeavingRef.current = true;
        settle.onConfirm();
      },
      onOpenChange: (open: boolean) => {
        // Radix auto-closes its Action after confirmation. Keep the overlay
        // until the editor unmounts so a slow exit cannot flash the editor.
        if (isLeavingRef.current) {
          return;
        }
        if (!open) {
          setIsConfirmingLeave(false);
        }
        settle.onOpenChange(open);
      },
    },
  };
}
