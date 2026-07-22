import { DndContext, DragOverlay, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type ReactNode, useState } from "react";
import { Button, Field, FieldError, FieldLabel, Input } from "@tryghost/shade/components";
import { LucideIcon, cn } from "@tryghost/shade/utils";
import { formatUrl } from "@tryghost/admin-x-settings/src/utils/format-url";
import useUrlInput from "@tryghost/admin-x-settings/src/hooks/use-url-input";

import { type EditableItem, type NavigationEditor, type NavigationItem, type NavigationItemErrors } from "./use-navigation-editor";

/**
 * One navigation list editor (primary or secondary), ported from the legacy
 * navigation-edit-form.tsx + navigation-item-editor.tsx with the old-DS
 * SortableList replaced by dnd-kit primitives directly: draggable existing
 * rows plus the pending new-item row with its add button.
 */

interface NavigationItemEditorProps {
    baseUrl: string;
    item: EditableItem;
    clearError?: (key: keyof NavigationItemErrors) => void;
    updateItem?: (item: Partial<NavigationItem>) => void;
    addItem?: () => void;
    labelPlaceholder?: string;
    action?: ReactNode;
    className?: string;
    testId?: string;
}

function NavigationItemEditor({ baseUrl, item, clearError, updateItem, addItem, labelPlaceholder, action, className, testId = "navigation-item-editor" }: NavigationItemEditorProps) {
    const urlInput = useUrlInput({
        baseUrl,
        nullable: true,
        value: item.url,
        onChange: (value) => updateItem?.({ url: value || "" }),
    });

    return (
        <div className={cn("flex w-full items-start gap-3", className)} data-testid={testId}>
            <Field className="flex-1 pt-1" data-invalid={Boolean(item.errors.label) || undefined}>
                <FieldLabel className="sr-only" htmlFor={`navigation-label-${item.id}`}>Label</FieldLabel>
                <Input
                    aria-invalid={Boolean(item.errors.label) || undefined}
                    id={`navigation-label-${item.id}`}
                    placeholder={labelPlaceholder}
                    value={item.label}
                    onChange={(e) => updateItem?.({ label: e.target.value })}
                    onKeyDown={(e) => {
                        updateItem?.({ label: (e.target as HTMLInputElement).value });
                        if (e.key === "Enter") {
                            e.preventDefault();
                            addItem?.();
                        }
                        if (item.errors.label) {
                            clearError?.("label");
                        }
                    }}
                />
                {item.errors.label && <FieldError>{item.errors.label}</FieldError>}
            </Field>
            <Field className="flex-1 pt-1" data-invalid={Boolean(item.errors.url) || undefined}>
                <FieldLabel className="sr-only" htmlFor={`navigation-url-${item.id}`}>URL</FieldLabel>
                <Input
                    aria-invalid={Boolean(item.errors.url) || undefined}
                    id={`navigation-url-${item.id}`}
                    value={urlInput.displayValue}
                    onBlur={urlInput.commitValue}
                    onChange={(event) => urlInput.setDisplayValue(event.target.value)}
                    onFocus={urlInput.handleFocus}
                    onKeyDown={(e) => {
                        urlInput.handleKeyDown(e);
                        const urls = formatUrl((e.target as HTMLInputElement).value, baseUrl, true);
                        updateItem?.({ url: urls.save || "" });
                    }}
                    onKeyUp={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            const urls = formatUrl((e.target as HTMLInputElement).value, baseUrl, true);
                            updateItem?.({ url: urls.save || "" });
                            addItem?.();
                        }
                        if (item.errors.url) {
                            clearError?.("url");
                        }
                    }}
                />
                {item.errors.url && <FieldError>{item.errors.url}</FieldError>}
            </Field>
            {action}
        </div>
    );
}

function SortableNavigationItem({ id, children }: { id: string; children: ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    return (
        <div
            ref={setNodeRef}
            className="group flex w-full items-start gap-3 bg-background py-1"
            style={{ transform: CSS.Transform.toString(transform), transition }}
        >
            <button
                className="mt-3 cursor-grab opacity-50 group-hover:opacity-100"
                type="button"
                {...attributes}
                {...listeners}
            >
                <LucideIcon.GripVertical className="size-4 text-muted-foreground" />
            </button>
            {children}
        </div>
    );
}

export function NavigationItemsEditor({ baseUrl, navigation }: { baseUrl: string; navigation: NavigationEditor }) {
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const draggingItem = draggingId ? navigation.items.find(({ id }) => id === draggingId) : null;

    return (
        <div className="w-full pt-2">
            <DndContext
                collisionDetection={closestCenter}
                onDragEnd={(event) => {
                    navigation.moveItem(event.active.id as string, event.over?.id as string | undefined);
                    setDraggingId(null);
                }}
                onDragStart={(event) => setDraggingId(event.active.id as string)}
            >
                <SortableContext items={navigation.items} strategy={verticalListSortingStrategy}>
                    {navigation.items.map((item) => (
                        <SortableNavigationItem key={item.id} id={item.id}>
                            <NavigationItemEditor
                                action={(
                                    <Button aria-label="Delete" className="mt-1 self-start" size="icon" variant="ghost" onClick={() => navigation.removeItem(item.id)}>
                                        <LucideIcon.Trash2 className="size-4" />
                                    </Button>
                                )}
                                baseUrl={baseUrl}
                                clearError={(key) => navigation.clearError(item.id, key)}
                                item={item}
                                updateItem={(updates) => navigation.updateItem(item.id, updates)}
                            />
                        </SortableNavigationItem>
                    ))}
                </SortableContext>
                <DragOverlay>
                    {draggingItem ? (
                        <div className="flex w-full items-start gap-3 bg-background py-1 opacity-75">
                            <LucideIcon.GripVertical className="mt-3 size-4 text-muted-foreground" />
                            <NavigationItemEditor baseUrl={baseUrl} item={draggingItem} testId="navigation-item-editor-overlay" />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
            <div className="flex items-start gap-3">
                <LucideIcon.Plus className="mt-4 ml-1 size-4 shrink-0 text-muted-foreground" />
                <NavigationItemEditor
                    action={(
                        <Button aria-label="Add" className="mt-1 self-start" data-testid="add-button" size="icon" variant="ghost" onClick={navigation.addItem}>
                            <LucideIcon.Plus className="size-4" />
                        </Button>
                    )}
                    addItem={navigation.addItem}
                    baseUrl={baseUrl}
                    className="mt-1"
                    clearError={(key) => navigation.clearError(navigation.newItem.id, key)}
                    item={navigation.newItem}
                    labelPlaceholder="New item label"
                    testId="new-navigation-item"
                    updateItem={navigation.setNewItem}
                />
            </div>
        </div>
    );
}
