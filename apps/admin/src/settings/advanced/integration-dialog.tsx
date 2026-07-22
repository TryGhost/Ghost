import { type ReactNode } from "react";
import { Button, Dialog, DialogContent, DialogTitle } from "@tryghost/shade/components";
import { cn } from "@tryghost/shade/utils";
import { useNavigate } from "@tryghost/admin-x-framework";

import { confirmIfDirty, useConfirmation } from "@/settings/app/shared/use-confirmation";

/**
 * Shared chrome for the routed integration configuration dialogs, replacing
 * the legacy NiceModal Modal + IntegrationHeader pair: full-bleed muted
 * header (logo, title, detail, optional extra like API keys), scrollable
 * body, sticky footer with optional custom left content and the legacy
 * Close/Save button contract. Every close path confirms discarding unsaved
 * changes when `dirty`.
 */

export interface IntegrationDialogProps {
    testId: string;
    icon: ReactNode;
    title: string;
    detail: string;
    headerExtra?: ReactNode;
    footerLeft?: ReactNode;
    /** Cancel button label; hidden when empty (single-button dialogs). */
    cancelLabel?: string;
    okLabel?: string;
    okColorClass?: string;
    okDisabled?: boolean;
    onOk?: () => void | Promise<void>;
    dirty?: boolean;
    className?: string;
    children?: ReactNode;
}

export function IntegrationDialog({
    testId,
    icon,
    title,
    detail,
    headerExtra,
    footerLeft,
    cancelLabel = "Close",
    okLabel,
    okColorClass,
    okDisabled,
    onOk,
    dirty = false,
    className,
    children,
}: IntegrationDialogProps) {
    const navigate = useNavigate();
    const { confirm } = useConfirmation();

    const requestClose = () => {
        confirmIfDirty(confirm, dirty, () => navigate("/settings/integrations"));
    };

    return (
        <Dialog open onOpenChange={(open) => !open && requestClose()}>
            <DialogContent
                className={cn("flex max-h-[85vh] max-w-[640px] flex-col gap-0 overflow-hidden p-0", className)}
                data-testid={testId}
            >
                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col gap-4 bg-muted p-8 md:flex-row">
                        <div className="size-14 shrink-0">{icon}</div>
                        <div className="mt-1.5 flex min-w-0 flex-1 flex-col">
                            <DialogTitle className="text-lg">{title}</DialogTitle>
                            <div className="text-sm text-muted-foreground">{detail}</div>
                            {headerExtra && <div className="mt-4">{headerExtra}</div>}
                        </div>
                    </div>
                    {children && <div className="p-8 pt-7">{children}</div>}
                </div>
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-8 py-4">
                    <div className="min-w-0">{footerLeft}</div>
                    <div className="flex shrink-0 items-center gap-2">
                        {cancelLabel !== "" && <Button variant="outline" onClick={requestClose}>{cancelLabel}</Button>}
                        {okLabel && (
                            <Button className={okColorClass} disabled={okDisabled} onClick={() => void onOk?.()}>
                                {okLabel}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
