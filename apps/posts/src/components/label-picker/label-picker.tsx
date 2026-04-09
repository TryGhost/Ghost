import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Badge, Command, CommandEmpty, CommandGroup, CommandItem, CommandList} from '@tryghost/shade/components';
import {EditRow} from './edit-row';
import {Label} from '@tryghost/admin-x-framework/api/labels';
import {LucideIcon} from '@tryghost/shade/utils';

function useControlledSearch(controlledValue?: string, onControlledChange?: (value: string) => void) {
    const [localSearch, setLocalSearch] = useState('');
    const search = controlledValue ?? localSearch;

    const handleSearchChange = useCallback((value: string) => {
        setLocalSearch(value);
        onControlledChange?.(value);
    }, [onControlledChange]);

    return {search, handleSearchChange};
}

export interface LabelPickerProps {
    labels: Label[];
    selectedSlugs: string[];
    resolvedSelectedLabels?: Label[];
    isLoading?: boolean;
    onToggle: (slug: string) => void;
    searchValue?: string;
    onSearchChange?: (search: string) => void;
    // Creation
    canCreateFromSearch?: (inputValue: string) => boolean;
    onCreate?: (name: string) => Promise<Label | undefined>;
    isCreating?: boolean;
    // Editing
    onEdit?: (id: string, name: string) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    isDuplicateName?: (name: string, excludeId?: string) => boolean;
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
    isDuplicateName?: (name: string, excludeId?: string) => boolean;
    canCreateFromSearch?: (inputValue: string) => boolean;
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
    isDuplicateName,
    canCreateFromSearch,
    onCreate,
    isCreating,
    onSearchClear
}) => {
    const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
    const normalizedSearch = search.trim().toLowerCase();
    const visibleLabels = normalizedSearch
        ? labels.filter(label => label.name.toLowerCase().includes(normalizedSearch))
        : labels;
    const showCreate = !!onCreate && search.trim() && canCreateFromSearch?.(search);
    const showEdit = !!onEdit;

    const handleCreate = async () => {
        if (onCreate) {
            const newLabel = await onCreate(search.trim());
            if (newLabel) {
                onToggle(newLabel.slug);
            }
            onSearchClear?.();
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
                                isDuplicateName={isDuplicateName}
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
    selectedSlugs,
    resolvedSelectedLabels,
    isLoading,
    onToggle,
    searchValue,
    onSearchChange,
    canCreateFromSearch,
    onCreate,
    isCreating,
    onEdit,
    onDelete,
    isDuplicateName
}) => {
    const selectedLabels = resolvedSelectedLabels || selectedSlugs
        .map(slug => labels.find(l => l.slug === slug))
        .filter((l): l is Label => !!l);

    return (
        <ComboboxPicker
            canCreateFromSearch={canCreateFromSearch}
            isCreating={isCreating}
            isDuplicateName={isDuplicateName}
            isLoading={isLoading}
            labels={labels}
            searchValue={searchValue}
            selectedLabels={selectedLabels}
            selectedSlugs={selectedSlugs}
            onCreate={onCreate}
            onDelete={onDelete}
            onEdit={onEdit}
            onSearchChange={onSearchChange}
            onToggle={onToggle}
        />
    );
};

// --- ComboboxPicker: chips-in-input + popover dropdown (for modals) ---

interface ComboboxPickerProps {
    labels: Label[];
    selectedLabels: Label[];
    selectedSlugs: string[];
    onToggle: (slug: string) => void;
    isLoading?: boolean;
    searchValue?: string;
    onSearchChange?: (search: string) => void;
    canCreateFromSearch?: (inputValue: string) => boolean;
    onCreate?: (name: string) => Promise<Label | undefined>;
    isCreating?: boolean;
    onEdit?: (id: string, name: string) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    isDuplicateName?: (name: string, excludeId?: string) => boolean;
}

const ComboboxPicker: React.FC<ComboboxPickerProps> = ({
    labels,
    selectedLabels,
    selectedSlugs,
    onToggle,
    isLoading,
    searchValue,
    onSearchChange,
    canCreateFromSearch,
    onCreate,
    isCreating,
    onEdit,
    onDelete,
    isDuplicateName
}) => {
    const [open, setOpen] = useState(false);
    const {search, handleSearchChange} = useControlledSearch(searchValue, onSearchChange);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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
                className="flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border border-transparent bg-gray-150 px-3 py-1 text-sm transition-colors focus-within:border-green focus-within:bg-transparent focus-within:shadow-[0_0_0_2px_rgba(48,207,67,.25)] dark:bg-gray-900"
                role="combobox"
                onClick={() => {
                    inputRef.current?.focus();
                    setOpen(true);
                }}
            >
                <SelectedPills labels={selectedLabels} onToggle={onToggle} />
                <input
                    ref={inputRef}
                    className="min-w-[80px] flex-1 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
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
                    {isLoading ? (
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                            Loading labels...
                        </div>
                    ) : (
                        <Command shouldFilter={false}>
                            <CommandList className="max-h-64 overflow-y-auto">
                                <LabelListItems
                                    canCreateFromSearch={canCreateFromSearch}
                                    isCreating={isCreating}
                                    isDuplicateName={isDuplicateName}
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
