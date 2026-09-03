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
 * Stops a navigation from losing what the writer typed. Every blocked exit —
 * router link, back button, or a native hash anchor into an Ember-owned route —
 * is put to the save engine, which finishes or saves whatever is outstanding
 * and answers `proceed` (leaving loses nothing) or `confirm` (ask first).
 * The session's own URL replace after a create is not an exit and passes
 * silently.
 */
export function useEditorLeaveGuard(
  session: EditorSessionHandle,
  postType: PostType,
): EditorLeaveGuard {
  const sessionKey = useEditorSessionKey();
  const isDirty = session.isDirty();
  const [isDecidingLeave, setIsDecidingLeave] = useState(false);

  const guard = useUnsavedChangesGuard({
    when: hasUnsavedWork(session.state, isDirty),
    confirmUnloadWhen: isDirty,
    // Keeps the dialog shut while the engine works out whether leaving is safe.
    isSaving: isDecidingLeave,
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
  const isDecidedRef = useRef(false);
  useEffect(() => {
    if (!isBlocked) {
      isDecidedRef.current = false;
      return;
    }
    if (isDecidedRef.current) {
      return;
    }
    isDecidedRef.current = true;
    setIsDecidingLeave(true);
    void leaveRequested().then((decision) => {
      if (!isMountedRef.current) {
        return;
      }
      if (decision === 'proceed') {
        // Releasing the block before `isDecidingLeave` drops; the other order
        // paints the dialog for a frame on the way out.
        guardRef.current.dialogProps.onConfirm();
      }
      setIsDecidingLeave(false);
    });
  }, [isBlocked, leaveRequested]);

  return { dialogProps: guard.dialogProps };
}
