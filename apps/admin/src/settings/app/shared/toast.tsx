import { type ReactNode, useCallback } from "react";
import { toast } from "sonner";
import { LucideIcon, cn } from "@tryghost/shade/utils";
import { APIError, SessionExpiredError, getErrorMessage } from "@tryghost/admin-x-framework/errors";

/**
 * Settings toasts, rendered through the sonner Toaster that ShadeApp already
 * mounts. Keeps the legacy toast contract (`data-testid="toast-<type>"`,
 * title + optional message) that the acceptance suites assert on.
 */

export type ToastType = "success" | "error" | "info";

export interface ShowToastProps {
    type: ToastType;
    title?: ReactNode;
    message?: ReactNode;
}

const TOAST_ICONS: Record<ToastType, ReactNode> = {
    success: <LucideIcon.CircleCheck className="size-4 text-state-success" />,
    error: <LucideIcon.CircleAlert className="size-4 text-destructive" />,
    info: <LucideIcon.Info className="size-4 text-muted-foreground" />,
};

export function showToast({ type, title, message }: ShowToastProps): void {
    toast.custom(id => (
        <div
            className="flex max-w-[320px] min-w-[272px] items-start justify-between gap-3 rounded-lg border border-border bg-surface-elevated p-4 text-foreground shadow-md"
            data-testid={`toast-${type}`}
        >
            <div className="flex items-start gap-2.5">
                <div className="mt-px shrink-0">{TOAST_ICONS[type]}</div>
                <div className="min-w-0">
                    {title && <span className="block text-sm font-semibold">{title}</span>}
                    {message && <div className={cn("text-sm text-muted-foreground", title && "mt-1")}>{message}</div>}
                </div>
            </div>
            <button
                aria-label="Close"
                className="shrink-0 cursor-pointer rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                type="button"
                onClick={() => toast.dismiss(id)}
            >
                <LucideIcon.X className="size-3.5" />
            </button>
        </div>
    ), { duration: 5000 });
}

/**
 * Mirrors admin-x-framework's useHandleError semantics for the native
 * settings screens, but renders through the settings toast above instead of
 * the framework's react-hot-toast (which has no <Toaster/> in this app).
 */
export function useSettingsHandleError() {
    return useCallback((error: unknown, { withToast = true }: { withToast?: boolean } = {}) => {
        // eslint-disable-next-line no-console
        console.error(error);

        if (!withToast) {
            return;
        }

        if (error instanceof APIError && error.response?.status === 418) {
            // Unmocked request in tests — never toast, just clear the queue
            // so lingering toasts don't block clicks.
            toast.dismiss();
        } else if (error instanceof SessionExpiredError) {
            toast.dismiss();
        } else if (error instanceof APIError) {
            toast.dismiss();
            showToast({ type: "error", message: getErrorMessage(error, error.message) });
        } else {
            toast.dismiss();
            showToast({ type: "error", message: "Something went wrong, please try again." });
        }
    }, []);
}
