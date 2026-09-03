import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import type { PostType } from '@/editor/card-config';
import { hasUnsavedWork, isCreatedIdUrlSwap } from './leave-guard';
import { useEditorSessionKey, type EditorSessionHandle } from './use-editor-session';

export interface EditorLeaveGuard {
  /** Wiring for Shade's `DirtyConfirmDialog`. */
  dialogProps: {
    open: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
  };
}

/**
 * Stops a navigation from losing what the writer typed. In-router navigations
 * and native `<a href="#/…">` anchors into Ember-owned routes are put to the
 * save engine, which finishes or saves whatever is outstanding and answers
 * `proceed` (leaving loses nothing) or `confirm` (ask first); a tab close or
 * reload gets the browser's own prompt. The session's own URL replace after a
 * create is not an exit and passes silently.
 *
 * Browser Back is not covered: the shared guard lets a POP through unless the
 * entry it returns to was created by the router, and admin reaches the editor
 * through a native hash anchor.
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
  });

  const guardRef = useRef(guard);
  guardRef.current = guard;
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

  const isUrlSwapBlocked = guard.interceptedNavigation.isBlocked;

  // Wait for a real exit to settle before replacing a new post's URL. React
  // Router owns one blocker target, so starting this replace while an exit is
  // blocked would overwrite the writer's original destination.
  const createdId = session.createdId;
  useEffect(() => {
    if (!createdId || guard.isBlocked || isUrlSwapBlocked || isLeavingRef.current) {
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
      setIsConfirmingLeave(false);
      return;
    }
    if (isDecidingRef.current) {
      return;
    }
    isDecidingRef.current = true;
    void leaveRequested().then((decision) => {
      if (!isMountedRef.current) {
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
        isLeavingRef.current = true;
        setIsConfirmingLeave(false);
        settle.onConfirm();
      },
      onOpenChange: (open: boolean) => {
        if (!open) {
          setIsConfirmingLeave(false);
        }
        settle.onOpenChange(open);
      },
    },
  };
}
