import { useEffect, useRef, useState } from 'react';
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
  const sessionKey = useEditorSessionKey();
  const isDirty = session.isDirty();
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);

  const guard = useUnsavedChangesGuard({
    when: hasUnsavedWork(session.state, isDirty),
    confirmUnloadWhen: isDirty,
    interceptNavigation: ({ currentLocation, nextLocation }) =>
      isCreatedIdUrlSwap(currentLocation, nextLocation, postType, sessionKey),
  });

  const guardRef = useRef(guard);
  guardRef.current = guard;

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isUrlSwapBlocked = guard.interceptedNavigation.isBlocked;
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
      guardRef.current.dialogProps.onConfirm();
    });
  }, [isBlocked, leaveRequested]);

  // The dialog answers the engine's verdict rather than the block itself: a
  // block is where the question starts, and most are settled without asking.
  // Reading the hook's own `open` would paint one on every blocked commit.
  const settle = guard.dialogProps;

  return {
    dialogProps: {
      open: isConfirmingLeave,
      onConfirm: () => {
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
