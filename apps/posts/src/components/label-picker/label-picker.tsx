import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    Badge,
    type ComboboxOptionSource,
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList
} from '@tryghost/shade/components';
import {EditRow} from './edit-row';
import {Label} from '@tryghost/admin-x-framework/api/labels';
import {LucideIcon} from '@tryghost/shade/utils';
import {canCreateLabel} from './can-create-label';

export interface LabelPickerProps {
    labels: Label[];
    optionSource: ComboboxOptionSource<string>;
    selectedSlugs: string[];
    resolvedSelectedLabels?: Label[];
    onToggle: (slug: string) => void;
    // Creation
    onCreate?: (name: string) => Promise<Label | undefined>;
    isCreating?: boolean;
    // Editing
    onEdit?: (id: string, name: string) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
}

// --- LabelRow: single label item with overlapping check/edit icon ---

interface LabelRowProps {
    label: Label;
    isSelected: boolean;
    showEdit: boolean;
    onToggle: (slug: string) => void;
    onEditClick: () => void;
}

const LabelRow: React.FC<LabelRowProps> = ({label, isSelected, showEdit, onToggle, onEditClick}) => (
    <CommandItem
        className="group"
        value={label.slug}
        onSelect={() => onToggle(label.slug)}
    >
        <span className="flex-1 truncate">{label.name}</span>
        {showEdit ? (
            <button
                aria-label={`Edit label ${label.name}`}
                className="relative ml-1 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onEditClick();
                }}
            >
                {isSelected && (
                    <LucideIcon.Check className="absolute size-3 text-primary transition-opacity duration-150 group-hover:opacity-0" />
                )}
                <LucideIcon.Pencil className="absolute size-3 translate-x-2 opacity-0 transition-all duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
            </button>
        ) : (
            isSelected && <LucideIcon.Check className="size-4 shrink-0 text-primary" />
        )}
    </CommandItem>
);

// --- Shared label list items (used by both modes) ---

interface LabelListItemsProps {
    labels: Label[];
    selectedSlugs: string[];
    search: string;
    onToggle: (slug: string) => void;
    onEdit?: (id: string, name: string) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    onCreate?: (name: string) => Promise<Label | undefined>;
    isCreating?: boolean;
    onSearchClear?: () => void;
}

const LabelListItems: React.FC<LabelListItemsProps> = ({
    labels,
    selectedSlugs,
    search,
    onToggle,
    onEdit,
    onDelete,
    onCreate,
    isCreating,
    onSearchClear
}) => {
    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
    const normalizedSearch = search.trim().toLowerCase();
    const visibleLabels = normalizedSearch
        ? labels.filter(label => label.name.toLowerCase().includes(normalizedSearch))
        : labels;
    const showCreate = !!onCreate && canCreateLabel(labels, search);
    const showEdit = !!onEdit;
    const handleCreate = async () => {
        if (!onCreate) {
            return;
        }
        try {
            const newLabel = await onCreate(search.trim());
            if (newLabel) {
                onSearchClear?.();
            }
        } catch {
            // Already reported via toast - keep the typed name for retry
        }
    };

    const handleEdit = async (id: string, name: string) => {
        if (onEdit) {
            await onEdit(id, name);
        }
    };

    const handleDelete = async (id: string) => {
        if (onDelete) {
            await onDelete(id);
            setEditingLabelId(null);
        }
    };

    return (
        <>
            {!showCreate && visibleLabels.length === 0 && (
                <CommandEmpty>No labels found</CommandEmpty>
            )}
            {visibleLabels.length > 0 && (
                <CommandGroup className="[&_[cmdk-group-heading]]:hidden">
                    {visibleLabels.map(label => (
                        editingLabelId === label.id ? (
                            <EditRow
                                key={label.id}
                                label={label}
                                onCancel={() => setEditingLabelId(null)}
                                onDelete={handleDelete}
                                onSave={handleEdit}
                            />
                        ) : (
                            <LabelRow
                                key={label.id}
                                isSelected={selectedSlugs.includes(label.slug)}
                                label={label}
                                showEdit={showEdit}
                                onEditClick={() => setEditingLabelId(label.id)}
                                onToggle={onToggle}
                            />
                        )
                    ))}
                </CommandGroup>
            )}
            {showCreate && (
                <CommandGroup className="[&_[cmdk-group-heading]]:hidden">
                    <CommandItem
                        disabled={isCreating}
                        onSelect={handleCreate}
                    >
                        <LucideIcon.Plus className="size-4" />
                        {isCreating ? 'Creating...' : `Create "${search.trim()}"`}
                    </CommandItem>
                </CommandGroup>
            )}
        </>
    );
};

// --- Selected labels as removable pills ---

interface SelectedPillsProps {
    labels: Label[];
    onToggle: (slug: string) => void;
}

const SelectedPills: React.FC<SelectedPillsProps> = ({labels, onToggle}) => (
    <>
        {labels.map(label => (
            <Badge
                key={label.id}
                className="cursor-pointer gap-1 pr-1"
                variant="outline"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle(label.slug);
                }}
            >
                {label.name}
                <LucideIcon.X className="size-3" />
            </Badge>
        ))}
    </>
);

// --- LabelPicker (main export) ---

const LabelPicker: React.FC<LabelPickerProps> = ({
    labels,
    optionSource,
    selectedSlugs,
    resolvedSelectedLabels,
    onToggle,
    onCreate,
    isCreating,
    onEdit,
    onDelete
}) => {
    const selectedLabels = resolvedSelectedLabels || selectedSlugs
        .map(slug => labels.find(l => l.slug === slug))
        .filter((l): l is Label => !!l);

    return (
        <ComboboxPicker
            isCreating={isCreating}
            labels={labels}
            optionSource={optionSource}
            selectedLabels={selectedLabels}
            selectedSlugs={selectedSlugs}
            onCreate={onCreate}
            onDelete={onDelete}
            onEdit={onEdit}
            onToggle={onToggle}
        />
    );
};

// --- ComboboxPicker: chips-in-input + popover dropdown (for modals) ---

interface ComboboxPickerProps {
    labels: Label[];
    optionSource: ComboboxOptionSource<string>;
    selectedLabels: Label[];
    selectedSlugs: string[];
    onToggle: (slug: string) => void;
    onCreate?: (name: string) => Promise<Label | undefined>;
    isCreating?: boolean;
    onEdit?: (id: string, name: string) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
}

const ComboboxPicker: React.FC<ComboboxPickerProps> = ({
    labels,
    optionSource,
    selectedLabels,
    selectedSlugs,
    onToggle,
    onCreate,
    isCreating,
    onEdit,
    onDelete
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        optionSource.onSearchChange?.(value);
    }, [optionSource]);

    // Close on click outside — no Radix Popover portal needed since this
    // component lives inside a Dialog. Avoiding the portal keeps the dropdown
    // in the Dialog's DOM subtree so Dialog scroll-lock doesn't block it.
    useEffect(() => {
        if (!open) {
            return;
        }
        const handlePointerDown = (e: PointerEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [open]);

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !search && selectedSlugs.length > 0) {
            onToggle(selectedSlugs[selectedSlugs.length - 1]);
        }
        if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <div
                className="flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border border-control-border bg-surface-elevated px-3 py-1 text-control transition-colors focus-within:border-focus-ring focus-within:ring-2 focus-within:ring-focus-ring/25 dark:bg-transparent"
                role="combobox"
                onClick={() => {
                    inputRef.current?.focus();
                    setOpen(true);
                }}
            >
                <SelectedPills labels={selectedLabels} onToggle={onToggle} />
                <input
                    ref={inputRef}
                    className="min-w-[80px] flex-1 bg-transparent text-control outline-hidden placeholder:text-muted-foreground"
                    placeholder={selectedLabels.length === 0 ? 'Search labels...' : ''}
                    value={search}
                    onChange={(e) => {
                        handleSearchChange(e.target.value);
                        if (!open) {
                            setOpen(true);
                        }
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleInputKeyDown}
                />
            </div>
            {open && (
                <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-white shadow-md dark:bg-gray-950">
                    {optionSource.isInitialLoad ? (
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                            Loading labels...
                        </div>
                    ) : (
                        <Command shouldFilter={false}>
                            <CommandList className="max-h-64 overflow-y-auto">
                                <LabelListItems
                                    isCreating={isCreating}
                                    labels={labels}
                                    search={search}
                                    selectedSlugs={selectedSlugs}
                                    onCreate={onCreate}
                                    onDelete={onDelete}
                                    onEdit={onEdit}
                                    onSearchClear={() => handleSearchChange('')}
                                    onToggle={onToggle}
                                />
                            </CommandList>
                        </Command>
                    )}
                </div>
            )}
        </div>
    );
};

export default LabelPicker;
