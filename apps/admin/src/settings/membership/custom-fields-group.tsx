import { useEffect, useRef, useState } from "react";
import { Button, NoValueLabel, NoValueLabelIcon, Tabs, TabsContent, TabsList, TabsTrigger } from "@tryghost/shade/components";
import { LucideIcon } from "@tryghost/shade/utils";
import { useBrowseMemberCustomFieldsIncludingArchived, userTypeForField } from "@tryghost/admin-x-framework/api/member-custom-fields";
import type { MemberCustomField } from "@tryghost/admin-x-framework/api/member-custom-fields";

import { CustomFieldDialog } from "./custom-field-dialog";
import { CustomFieldTypeIcon } from "./custom-field-type-icon";
import { SettingGroup } from "@/settings/app/shared/setting-group";
import { useFeatureFlag } from "@/hooks/use-feature-flag";

/**
 * The Custom fields group, ported from the legacy membership/custom-fields.tsx:
 * active/archived tabs, five-row collapse behind "Show all", and the
 * create/edit dialog.
 */

// How many fields render before the list collapses behind "Show all" — the
// recommendations list's preview size.
const PREVIEW_COUNT = 5;

function FieldList({ fields, showAll, onShowAll, openDialog }: {
    fields: MemberCustomField[];
    // Lifted to the parent: Tabs unmount hidden panels, so local state
    // would forget an expanded list on every tab switch.
    showAll: boolean;
    onShowAll: () => void;
    openDialog: (field: MemberCustomField) => void;
}) {
    if (fields.length === 0) {
        return (
            <NoValueLabel>
                <NoValueLabelIcon><LucideIcon.TextCursorInput /></NoValueLabelIcon>
                No custom fields found.
            </NoValueLabel>
        );
    }

    // The endpoint returns the full (deliberately small) list, so "Show all"
    // is a client-side reveal — same UI as the recommendations table.
    const visibleFields = showAll ? fields : fields.slice(0, PREVIEW_COUNT);

    return (
        <>
            <div>
                {visibleFields.map((field) => {
                    const userType = userTypeForField(field);
                    return (
                        <div
                            key={field.key}
                            className="group flex w-full cursor-pointer items-center gap-3 border-b border-border py-3 last:border-b-0 hover:bg-muted/40"
                            data-testid="custom-field-list-item"
                            onClick={() => openDialog(field)}
                        >
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <CustomFieldTypeIcon className="size-[18px]" typeId={field.type} />
                            </div>
                            <div className="flex min-w-0 grow flex-col">
                                <span className="font-semibold">{field.name}</span>
                                <span className="text-sm text-muted-foreground">{userType.label}</span>
                            </div>
                            {/* The Edit button stays visible (not hover-only) so it's
                                keyboard-focusable — the row div isn't. stopPropagation
                                keeps a button click from also firing the row's onClick. */}
                            <Button className="text-state-success" size="sm" variant="ghost" onClick={(e) => {
                                e.stopPropagation();
                                openDialog(field);
                            }}>Edit</Button>
                        </div>
                    );
                })}
            </div>
            {!showAll && fields.length > PREVIEW_COUNT && (
                <div className="flex items-center gap-2 border-t border-border pt-2 font-bold text-state-success">
                    <button className="cursor-pointer hover:opacity-80" type="button" onClick={onShowAll}>Show all</button>
                </div>
            )}
        </>
    );
}

export function CustomFieldsGroup({ keywords }: { keywords: string[] }) {
    // The endpoint is closed (404s) while the flag is off, so keep the query
    // in step with the flag rather than firing it into a wall.
    const hasCustomFields = useFeatureFlag("membersCustomFields");
    const { data } = useBrowseMemberCustomFieldsIncludingArchived({
        enabled: hasCustomFields,
    });
    const fields = data?.members_custom_fields || [];
    const [selectedTab, setSelectedTab] = useState("active-fields");
    const [showAllActive, setShowAllActive] = useState(false);
    const [showAllArchived, setShowAllArchived] = useState(false);
    const [dialogState, setDialogState] = useState<{ open: boolean; field?: MemberCustomField }>({ open: false });

    const activeFields = fields.filter((field) => field.status === "active");
    const archivedFields = fields.filter((field) => field.status === "archived");

    // The collapse is an initial-view optimization only: fields append in
    // insertion order, so a just-created (or just-reactivated) field is
    // always LAST — exactly the hidden slot. When a tab's list grows while
    // the screen is open, expand it so the new arrival is visible in place
    // rather than silently swallowed behind "Show all".
    const previousCounts = useRef({ active: 0, archived: 0 });
    useEffect(() => {
        if (activeFields.length > previousCounts.current.active && previousCounts.current.active > 0) {
            setShowAllActive(true);
        }
        if (archivedFields.length > previousCounts.current.archived && previousCounts.current.archived > 0) {
            setShowAllArchived(true);
        }
        previousCounts.current = { active: activeFields.length, archived: archivedFields.length };
    }, [activeFields.length, archivedFields.length]);

    const openDialog = (field?: MemberCustomField) => setDialogState({ open: true, field });

    return (
        <SettingGroup
            customButtons={<Button size="sm" variant="ghost" onClick={() => openDialog()}>Add custom field</Button>}
            description="Create and manage custom fields to store extra information about your members"
            keywords={keywords}
            navid="custom-fields"
            testId="custom-fields"
            title="Custom fields"
        >
            {/* Both tabs render (empty ones included) once ANY field exists —
                but a site with no fields at all gets no tabs, just the group
                description. */}
            {fields.length > 0 && (
                <Tabs value={selectedTab} variant="underline" onValueChange={setSelectedTab}>
                    <TabsList>
                        <TabsTrigger value="active-fields">Active</TabsTrigger>
                        <TabsTrigger value="archived-fields">Archived</TabsTrigger>
                    </TabsList>
                    <TabsContent value="active-fields"><FieldList fields={activeFields} openDialog={openDialog} showAll={showAllActive} onShowAll={() => setShowAllActive(true)} /></TabsContent>
                    <TabsContent value="archived-fields"><FieldList fields={archivedFields} openDialog={openDialog} showAll={showAllArchived} onShowAll={() => setShowAllArchived(true)} /></TabsContent>
                </Tabs>
            )}
            {dialogState.open && (
                <CustomFieldDialog field={dialogState.field} onClose={() => setDialogState({ open: false })} />
            )}
        </SettingGroup>
    );
}
