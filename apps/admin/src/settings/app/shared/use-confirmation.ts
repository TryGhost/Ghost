import { type ReactNode, createContext, useContext } from "react";

/**
 * Context surface for the settings confirmation dialogs (see
 * confirmation.tsx for the provider/host). Kept separate so provider files
 * only export components (react-refresh/only-export-components).
 */

export interface ConfirmOptions {
    title: ReactNode;
    prompt: ReactNode;
    okLabel: string;
    /** Label shown while an async `onOk` is in flight (e.g. "Suspending..."). */
    okRunningLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    /** The dialog closes when this resolves; it stays open if it throws. */
    onOk: () => void | Promise<void>;
}

export interface LimitOptions {
    prompt: ReactNode;
    onOk?: () => void;
}

export interface ConfirmationContextValue {
    confirm: (options: ConfirmOptions) => void;
    showLimit: (options: LimitOptions) => void;
}

export const ConfirmationContext = createContext<ConfirmationContextValue | null>(null);

export function useConfirmation(): ConfirmationContextValue {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error("useConfirmation must be used within ConfirmationProvider");
    }
    return context;
}

/** The legacy confirmIfDirty contract: run the action, or confirm discarding unsaved changes first. */
export function confirmIfDirty(
    confirm: ConfirmationContextValue["confirm"],
    dirty: boolean,
    action: () => void,
): void {
    if (!dirty) {
        action();
        return;
    }
    confirm({
        title: "Are you sure you want to leave this page?",
        prompt: "Hey there! It looks like you didn't save the changes you made. Save before you go!",
        okLabel: "Leave",
        cancelLabel: "Stay",
        destructive: true,
        onOk: action,
    });
}
