import { useCallback, useEffect, useRef } from "react";
import { useBlocker, useConfirmUnload } from "@tryghost/admin-x-framework";
import { getLeaveDecision } from "./state";
import type { UseEditorResult } from "./use-editor";

export interface LeaveGuardResult {
    /** True while the "are you sure you want to leave?" dialog should show. */
    isConfirming: boolean;
    stay: () => void;
    leave: () => void;
}

/**
 * In-app navigation guard for the editor, mirroring Ember's
 * `_getLeaveTransitionState` flow (ghost/admin/app/controllers/lexical-editor.js):
 *
 * - dirty drafts save silently on leave, then navigation proceeds
 * - dirty published/scheduled/sent posts (or drafts whose leave-save failed
 *   or left them dirty) require confirmation via dialog
 * - browser unload is guarded by the native beforeunload confirm
 */
export function useLeaveGuard(editor: UseEditorResult): LeaveGuardResult {
    const { state, dispatch, requestSave } = editor;

    // read the live state at navigation time, not a closed-over snapshot
    const stateRef = useRef(state);
    stateRef.current = state;

    // a leave-save that failed must escalate to confirmation rather than
    // retrying forever (saveOnLeavePerformed is only set on success)
    const leaveSaveFailedRef = useRef(false);

    const blocker = useBlocker(useCallback(({ currentLocation, nextLocation }: {
        currentLocation: { pathname: string };
        nextLocation: { pathname: string };
    }) => {
        if (currentLocation.pathname === nextLocation.pathname) {
            return false;
        }
        const decision = getLeaveDecision(stateRef.current);
        return decision.shouldSaveOnLeave || decision.shouldConfirmLeave;
    }, []));

    const isBlocked = blocker.state === "blocked";
    const isSaving = state.save.status === "saving";

    useEffect(() => {
        if (!isBlocked) {
            leaveSaveFailedRef.current = false;
            return;
        }

        // wait for in-flight saves (including the leave-save) to settle
        if (isSaving) {
            return;
        }

        if (state.save.status === "error" && state.save.kind === "leave") {
            leaveSaveFailedRef.current = true;
        }

        const decision = getLeaveDecision(state);

        if (decision.shouldSaveOnLeave && !leaveSaveFailedRef.current) {
            requestSave("leave");
            return;
        }

        if (!decision.shouldConfirmLeave && !leaveSaveFailedRef.current) {
            blocker.proceed?.();
        }
        // otherwise the confirmation dialog is showing (isConfirming below)
    }, [isBlocked, isSaving, state, requestSave, blocker]);

    const decision = getLeaveDecision(state);
    const isConfirming = isBlocked && !isSaving
        && (decision.shouldConfirmLeave || leaveSaveFailedRef.current);

    useConfirmUnload(editor.isDirty);

    return {
        isConfirming,
        stay: () => {
            leaveSaveFailedRef.current = false;
            blocker.reset?.();
        },
        leave: () => {
            dispatch({ type: "LEAVE_CONFIRMED" });
            blocker.proceed?.();
        },
    };
}
