import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@tryghost/shade/components";
import { cn } from "@tryghost/shade/utils";
import { useLocation } from "@tryghost/admin-x-framework";
import type { SaveState } from "@tryghost/admin-x-framework/hooks";

import { useScrollSpySection } from "@/settings/app/use-scroll-spy";
import { useSettingsSearch } from "@/settings/app/use-settings-search";

/**
 * The chrome of one settings group: card, title/description header, and the
 * view→Edit→Save/Cancel button contract ported from admin-x-design-system's
 * SettingGroup (same labels, same enable/disable rules), rebuilt on Shade.
 * Groups hide (legacy-style, `hidden` class) while a search filter excludes
 * their keywords, except in the nothing-matched state.
 */

export interface SettingGroupProps {
    navid?: string;
    testId?: string;
    title?: ReactNode;
    description?: ReactNode;
    /** Search keywords; the group hides when a filter excludes them all. */
    keywords?: string[];
    isEditing?: boolean;
    saveState?: SaveState;
    customButtons?: ReactNode;
    children?: ReactNode;
    hideEditButton?: boolean;
    onEditingChange?: (isEditing: boolean) => void;
    onSave?: () => void | Promise<unknown>;
    onCancel?: () => void;
}

/** The `/settings/:segment` currently routed to, for the group highlight. */
function useCurrentSegment(): string | null {
    const { pathname } = useLocation();
    return /^\/settings\/([^/]+)/.exec(pathname)?.[1] ?? null;
}

export function SettingGroup({
    navid,
    testId,
    title,
    description,
    keywords,
    isEditing,
    saveState,
    customButtons,
    children,
    hideEditButton,
    onEditingChange,
    onSave,
    onCancel,
}: SettingGroupProps) {
    const currentSegment = useCurrentSegment();
    const { checkVisible, noResult } = useSettingsSearch();
    const isVisible = !keywords || checkVisible(keywords) || noResult;
    const [highlight, setHighlight] = useState(false);
    const sectionRef = useScrollSpySection(navid);

    // Flash a highlight when the sidebar routes directly to this group.
    useEffect(() => {
        if (navid && currentSegment === navid) {
            setHighlight(true);
            const timer = setTimeout(() => setHighlight(false), 2000);
            return () => clearTimeout(timer);
        }
        setHighlight(false);
    }, [currentSegment, navid]);

    // Cmd/Ctrl+S saves the group being edited.
    useEffect(() => {
        if (!isEditing || !onSave) {
            return;
        }
        const handleCmdS = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                void onSave();
            }
        };
        window.addEventListener("keydown", handleCmdS);
        return () => {
            window.removeEventListener("keydown", handleCmdS);
        };
    }, [isEditing, onSave]);

    let buttons: ReactNode = customButtons;
    if (!customButtons && onEditingChange) {
        if (isEditing) {
            buttons = (
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                        onCancel?.();
                        onEditingChange(false);
                    }}>Cancel</Button>
                    <Button
                        disabled={saveState !== "unsaved"}
                        size="sm"
                        variant="default"
                        onClick={() => void onSave?.()}
                    >
                        {saveState === "saving" ? "Saving..." : "Save"}
                    </Button>
                </div>
            );
        } else if (!hideEditButton) {
            buttons = (
                <Button size="sm" variant="ghost" onClick={() => onEditingChange(true)}>
                    {saveState === "saved" ? "Saved" : "Edit"}
                </Button>
            );
        } else if (saveState === "saved") {
            buttons = (
                <Button className="text-state-success" size="sm" variant="ghost" onClick={() => onEditingChange(true)}>
                    Saved
                </Button>
            );
        }
    }

    return (
        <div
            ref={sectionRef}
            className={cn(
                "relative scroll-mt-16 flex-col gap-6 rounded-xl border border-border p-5 transition-all md:p-7",
                isVisible ? "flex" : "hidden",
                (isEditing || highlight) && "shadow-sm",
            )}
            data-testid={testId}
            id={navid}
        >
            <div className="flex items-start justify-between gap-4">
                {(title || description) && (
                    <div>
                        <h5 className="text-lg font-semibold tracking-tight">{title}</h5>
                        {description && <p className="mt-1 mr-5 text-sm text-pretty text-muted-foreground">{description}</p>}
                    </div>
                )}
                <div className="-mt-1 shrink-0">{buttons}</div>
            </div>
            {children}
        </div>
    );
}

export interface SettingValueProps {
    key: string;
    heading?: string;
    value: ReactNode;
    hint?: ReactNode;
}

export function SettingValue({ heading, value, hint }: Omit<SettingValueProps, "key">) {
    return (
        <div className="flex flex-col">
            {heading && <h6 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{heading}</h6>}
            <div className={cn("flex items-center", heading && "mt-1")}>{value}</div>
            {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
        </div>
    );
}

export interface SettingGroupContentProps {
    columns?: 1 | 2;
    /** Standard-formatted view-mode values. */
    values?: SettingValueProps[];
    children?: ReactNode;
    className?: string;
}

export function SettingGroupContent({ columns, values, children, className }: SettingGroupContentProps) {
    return (
        <div
            className={cn(
                columns === 2 ? "grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2" : "flex flex-col gap-x-5",
                className ?? "gap-y-7",
            )}
        >
            {values?.map(({ key, ...props }) => <SettingValue key={key} {...props} />)}
            {children}
        </div>
    );
}
