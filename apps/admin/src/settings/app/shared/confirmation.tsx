import { type ReactNode, useCallback, useMemo, useState } from "react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Button,
} from "@tryghost/shade/components";

import { ConfirmationContext, type ConfirmOptions, type LimitOptions } from "./use-confirmation";

/**
 * Imperative confirmation dialogs for the native settings screens — the
 * Shade-Dialog replacement for the legacy NiceModal ConfirmationModal /
 * LimitModal pair. One host renders the currently requested dialog;
 * `confirm()` / `showLimit()` (use-confirmation.ts) request one from
 * anywhere under the provider. Testids (`confirmation-modal`,
 * `limit-modal`) match the legacy contract.
 */

type ActiveDialog =
    | { kind: "confirm"; options: ConfirmOptions }
    | { kind: "limit"; options: LimitOptions };

export function ConfirmationProvider({ children }: { children: ReactNode }) {
    const [active, setActive] = useState<ActiveDialog | null>(null);
    const [running, setRunning] = useState(false);

    const confirm = useCallback((options: ConfirmOptions) => {
        setRunning(false);
        setActive({ kind: "confirm", options });
    }, []);

    const showLimit = useCallback((options: LimitOptions) => {
        setRunning(false);
        setActive({ kind: "limit", options });
    }, []);

    const value = useMemo(() => ({ confirm, showLimit }), [confirm, showLimit]);

    const close = () => {
        setActive(null);
        setRunning(false);
    };

    const handleOk = async () => {
        if (!active) {
            return;
        }
        if (active.kind === "limit") {
            active.options.onOk?.();
            close();
            return;
        }
        setRunning(true);
        try {
            await active.options.onOk();
            close();
        } catch {
            // The action surfaces its own error (toast); keep the dialog open.
            setRunning(false);
        }
    };

    const isLimit = active?.kind === "limit";
    const title = isLimit ? "Upgrade your plan" : active?.options.title;
    const prompt = active?.options.prompt;
    const okLabel = isLimit
        ? "Upgrade"
        : (running && active?.options.okRunningLabel) || active?.options.okLabel;
    const cancelLabel = (!isLimit && active?.options.cancelLabel) || "Cancel";
    const destructive = !isLimit && Boolean(active?.options.destructive);

    return (
        <ConfirmationContext.Provider value={value}>
            {children}
            <AlertDialog open={active !== null} onOpenChange={(open) => !open && close()}>
                <AlertDialogContent data-testid={isLimit ? "limit-modal" : "confirmation-modal"}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{title}</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div>{prompt}</div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button disabled={running} variant="outline" onClick={close}>{cancelLabel}</Button>
                        <Button
                            disabled={running}
                            variant={destructive ? "destructive" : "default"}
                            onClick={() => void handleOk()}
                        >
                            {okLabel}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ConfirmationContext.Provider>
    );
}
