import { type ReactNode } from "react";
import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    ToggleGroup,
    ToggleGroupItem,
} from "@tryghost/shade/components";
import { LucideIcon, cn } from "@tryghost/shade/utils";

/**
 * The full-screen preview surface shared by the design and announcement-bar
 * dialogs: preview pane with the `design-toolbar` header (tabs left, device
 * toggle + view-site link right) and a 400px settings sidebar with the
 * Close/Save buttons — the native Shade equivalent of the legacy
 * PreviewModalContent layout and its test surface (testids `design-toolbar`,
 * `preview-desktop`, `preview-mobile`).
 */

export type PreviewDevice = "desktop" | "mobile";

export function PreviewDeviceToggle({ device, onChange }: { device: PreviewDevice; onChange: (device: PreviewDevice) => void }) {
    return (
        <ToggleGroup type="single" value={device} onValueChange={(value) => {
            if (value === "desktop" || value === "mobile") {
                onChange(value);
            }
        }}>
            <ToggleGroupItem aria-label="Desktop" value="desktop"><LucideIcon.Laptop /></ToggleGroupItem>
            <ToggleGroupItem aria-label="Mobile" value="mobile"><LucideIcon.Smartphone /></ToggleGroupItem>
        </ToggleGroup>
    );
}

export function DesktopChromeFrame({ children }: { children: ReactNode }) {
    return (
        <div className="flex size-full flex-col px-8" data-testid="preview-desktop">
            <div className="size-full overflow-hidden rounded-t-[4px] shadow-sm">{children}</div>
        </div>
    );
}

export function MobileChromeFrame({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-[775px] w-[380px] flex-col rounded-3xl bg-surface-elevated p-2 shadow-xl" data-testid="preview-mobile">
            <div className="size-full grow overflow-auto rounded-2xl border border-border">{children}</div>
        </div>
    );
}

export interface PreviewDialogProps {
    testId: string;
    title: string;
    /** Disables both header buttons (e.g. while saving). */
    buttonsDisabled?: boolean;
    okLabel?: string;
    onOk: () => void;
    /** Requested by Close button, Escape and backdrop click — run any dirty confirm here. */
    onClose: () => void;
    previewToolbarTabs?: ReactNode;
    device: PreviewDevice;
    onDeviceChange: (device: PreviewDevice) => void;
    siteLink?: string;
    /** The raw preview content; wrapped in the desktop/mobile chrome here. */
    preview: ReactNode;
    sidebar: ReactNode;
    sidebarPadding?: boolean;
    previewBgClassName?: string;
}

export function PreviewDialog({
    testId,
    title,
    buttonsDisabled,
    okLabel,
    onOk,
    onClose,
    previewToolbarTabs,
    device,
    onDeviceChange,
    siteLink,
    preview,
    sidebar,
    sidebarPadding = true,
    previewBgClassName = "bg-muted",
}: PreviewDialogProps) {
    const framedPreview = device === "desktop"
        ? <DesktopChromeFrame>{preview}</DesktopChromeFrame>
        : <MobileChromeFrame>{preview}</MobileChromeFrame>;

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                aria-describedby={undefined}
                className="inset-0 top-0 left-0 block h-dvh w-screen max-w-none translate-x-0 gap-0 rounded-none p-0 sm:rounded-none"
                data-testid={testId}
            >
                <DialogTitle className="sr-only">{title}</DialogTitle>
                <div className="flex h-full">
                    <div className={cn("relative flex min-w-0 grow flex-col", previewBgClassName)}>
                        <header className="relative flex h-[80px] shrink-0 items-center justify-center px-8 py-5" data-testid="design-toolbar">
                            <div className="absolute left-8 flex h-full items-center">{previewToolbarTabs}</div>
                            <div className="absolute right-8 flex h-full items-center">
                                <PreviewDeviceToggle device={device} onChange={onDeviceChange} />
                                {siteLink && (
                                    <div className="ml-3 border-l border-border">
                                        <a className="ml-3 flex items-center gap-1 text-sm" href={siteLink} rel="noopener noreferrer" target="_blank">
                                            View site <LucideIcon.ArrowUpRight className="size-3.5" />
                                        </a>
                                    </div>
                                )}
                            </div>
                        </header>
                        <div className="flex min-h-0 grow items-center justify-center">{framedPreview}</div>
                    </div>
                    <div className="relative flex h-full w-[400px] shrink-0 flex-col border-l border-border bg-background">
                        <div className="flex max-h-[82px] items-center justify-between gap-3 px-7 py-6">
                            <h2 className="min-w-0 truncate text-lg font-semibold tracking-tight">{title}</h2>
                            <div className="flex shrink-0 items-center gap-2">
                                <Button disabled={buttonsDisabled} variant="outline" onClick={onClose}>Close</Button>
                                <Button disabled={buttonsDisabled} variant="default" onClick={onOk}>{okLabel || "Save"}</Button>
                            </div>
                        </div>
                        <div className={cn("flex min-h-0 grow flex-col overflow-y-auto", sidebarPadding && "px-7 pb-7")}>
                            {sidebar}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
