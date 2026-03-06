import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    Badge,
    Button,
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
    LucideIcon,
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@tryghost/shade';
import {Label} from '@tryghost/admin-x-framework/api/labels';

export interface LabelPickerProps {
    labels: Label[];
    selectedSlugs: string[];
    isLoading?: boolean;
    onToggle: (slug: string) => void;
    // Creation
    canCreateFromSearch?: (inputValue: string) => boolean;
    onCreate?: (name: string) => Promise<Label | undefined>;
    isCreating?: boolean;
    // Editing
    onEdit?: (id: string, name: string) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    isDuplicateName?: (name: string, excludeId?: string) => boolean;
    // Layout
    inline?: boolean;
    align?: 'start' | 'end';
}

// --- EditRow ---

interface EditRowProps {
    label: Label;
    onSave: (id: string, name: string) => Promise<void>;
    onCancel: () => void;
    onDelete: (id: string) => Promise<void>;
    isDuplicateName?: (name: string, excludeId?: string) => boolean;
}

const EditRow: React.FC<EditRowProps> = ({label, onSave, onCancel, onDelete, isDuplicateName}) => {
    const [name, setName] = useState(label.name);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const isBusy = isSaving || isDeleting;

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const validate = (value: string): string => {
        const trimmed = value.trim();
        if (!trimmed) {
            return 'Name is required';
        }
        if (isDuplicateName?.(trimmed, label.id)) {
            return 'A label with this name already exists';
        }
        return '';
    };

    const handleSave = async () => {
        const validationError = validate(name);
        if (validationError) {
            setError(validationError);
            return;
        }
        setIsSaving(true);
        try {
            await onSave(label.id, name.trim());
            onCancel();
        } catch {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            if (!isBusy) {
                onCancel();
            }
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete(label.id);
        } catch {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <div className="flex flex-col gap-2 py-1.5" data-edit-row>
            <input
                ref={inputRef}
                className="h-7 w-full rounded border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                disabled={isBusy}
                type="text"
                value={name}
                onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                }}
                onKeyDown={handleKeyDown}
            />
            {error && <span className="text-xs text-destructive">{error}</span>}
            {showDeleteConfirm ? (
                <div className="flex items-center gap-1 text-sm">
                    <span className="flex-1 font-semibold">Delete label?</span>
                    <Button
                        className="h-6 px-2 text-xs"
                        disabled={isBusy}
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="h-6 px-2 text-xs"
                        disabled={isBusy}
                        size="sm"
                        variant="destructive"
                        onClick={handleDelete}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </div>
            ) : (
                <div className="flex items-center">
                    <Button
                        className="h-6 gap-1 px-1.5 text-xs text-red hover:bg-red/5 hover:text-red"
                        disabled={isBusy}
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowDeleteConfirm(true)}
                    >
                        Delete
                    </Button>
                    <div className="ml-auto flex gap-1">
                        <Button
                            className="h-6 px-2 text-xs"
                            disabled={isBusy}
                            size="sm"
                            variant="outline"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="h-6 px-2 text-xs"
                            disabled={isBusy}
                            size="sm"
                            onClick={handleSave}
                        >
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

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

    const filteredLabels = labels.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
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
            {!showCreate && filteredLabels.length === 0 && (
                <CommandEmpty>No labels found</CommandEmpty>
            )}
            {filteredLabels.length > 0 && (
                <CommandGroup className="[&_[cmdk-group-heading]]:hidden">
                    {filteredLabels.map(label => (
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
    isLoading,
    onToggle,
    canCreateFromSearch,
    onCreate,
    isCreating,
    onEdit,
    onDelete,
    isDuplicateName,
    inline = false,
    align = 'start'
}) => {
    const selectedLabels = selectedSlugs
        .map(slug => labels.find(l => l.slug === slug))
        .filter((l): l is Label => !!l);

    // --- Inline mode (for filter cells): minimal trigger + popover ---
    if (inline) {
        return (
            <InlinePopover
                align={align}
                canCreateFromSearch={canCreateFromSearch}
                isCreating={isCreating}
                isDuplicateName={isDuplicateName}
                isLoading={isLoading}
                labels={labels}
                selectedLabels={selectedLabels}
                selectedSlugs={selectedSlugs}
                onCreate={onCreate}
                onDelete={onDelete}
                onEdit={onEdit}
                onToggle={onToggle}
            />
        );
    }

    // --- Default mode (for modals): combobox-like input with chips + dropdown ---
    return (
        <ComboboxPicker
            canCreateFromSearch={canCreateFromSearch}
            isCreating={isCreating}
            isDuplicateName={isDuplicateName}
            isLoading={isLoading}
            labels={labels}
            selectedLabels={selectedLabels}
            selectedSlugs={selectedSlugs}
            onCreate={onCreate}
            onDelete={onDelete}
            onEdit={onEdit}
            onToggle={onToggle}
        />
    );
};

// --- InlinePopover: trigger + popover aligned to parent container (for filter cells) ---

interface InlinePopoverProps {
    labels: Label[];
    selectedLabels: Label[];
    selectedSlugs: string[];
    onToggle: (slug: string) => void;
    isLoading?: boolean;
    align?: 'start' | 'end';
    canCreateFromSearch?: (inputValue: string) => boolean;
    onCreate?: (name: string) => Promise<Label | undefined>;
    isCreating?: boolean;
    onEdit?: (id: string, name: string) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    isDuplicateName?: (name: string, excludeId?: string) => boolean;
}

const InlinePopover: React.FC<InlinePopoverProps> = ({
    labels,
    selectedLabels,
    selectedSlugs,
    onToggle,
    isLoading,
    align = 'start',
    canCreateFromSearch,
    onCreate,
    isCreating,
    onEdit,
    onDelete,
    isDuplicateName
}) => {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [alignOffset, setAlignOffset] = useState(0);

    // Measure the offset between the trigger and its parent wrapper so
    // the popover aligns with the outer container edge, not the padded inner
    const updateAlignOffset = useCallback(() => {
        const trigger = triggerRef.current;
        const parent = trigger?.parentElement;
        if (trigger && parent) {
            const triggerRect = trigger.getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();
            setAlignOffset(Math.round(parentRect.left - triggerRect.left));
        }
    }, []);

    const triggerText = selectedLabels.length === 0
        ? 'Select...'
        : selectedLabels.length === 1
            ? selectedLabels[0].name
            : `${selectedLabels.length} labels`;

    return (
        <Popover
            onOpenChange={(open) => {
                if (open) {
                    updateAlignOffset();
                }
            }}
        >
            <PopoverTrigger asChild>
                <button
                    ref={triggerRef}
                    className="flex size-full items-center truncate text-left text-sm"
                    type="button"
                >
                    {triggerText}
                </button>
            </PopoverTrigger>
            <PopoverContent align={align} alignOffset={alignOffset} className="w-64 p-0">
                {isLoading ? (
                    <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                        Loading labels...
                    </div>
                ) : (
                    <InlineList
                        canCreateFromSearch={canCreateFromSearch}
                        isCreating={isCreating}
                        isDuplicateName={isDuplicateName}
                        labels={labels}
                        selectedLabels={selectedLabels}
                        selectedSlugs={selectedSlugs}
                        onCreate={onCreate}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onToggle={onToggle}
                    />
                )}
            </PopoverContent>
        </Popover>
    );
};

// --- InlineList: Command with its own search (for filter popover) ---

interface InlineListProps {
    labels: Label[];
    selectedLabels: Label[];
    selectedSlugs: string[];
    onToggle: (slug: string) => void;
    canCreateFromSearch?: (inputValue: string) => boolean;
    onCreate?: (name: string) => Promise<Label | undefined>;
    isCreating?: boolean;
    onEdit?: (id: string, name: string) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    isDuplicateName?: (name: string, excludeId?: string) => boolean;
}

const InlineList: React.FC<InlineListProps> = ({selectedLabels, ...rest}) => {
    const [search, setSearch] = useState('');

    return (
        <Command shouldFilter={false}>
            {selectedLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-b px-3 py-2">
                    <SelectedPills labels={selectedLabels} onToggle={rest.onToggle} />
                </div>
            )}
            <div className="flex items-center border-b px-3">
                <LucideIcon.Search className="mr-2 size-4 shrink-0 opacity-50" />
                <input
                    className="flex h-9 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                    placeholder="Search labels..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>
            <CommandList className="max-h-64 overflow-y-auto">
                <LabelListItems
                    {...rest}
                    search={search}
                    onSearchClear={() => setSearch('')}
                />
            </CommandList>
        </Command>
    );
};

// --- ComboboxPicker: chips-in-input + popover dropdown (for modals) ---

interface ComboboxPickerProps {
    labels: Label[];
    selectedLabels: Label[];
    selectedSlugs: string[];
    onToggle: (slug: string) => void;
    isLoading?: boolean;
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
    canCreateFromSearch,
    onCreate,
    isCreating,
    onEdit,
    onDelete,
    isDuplicateName
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
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
                    className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    placeholder={selectedLabels.length === 0 ? 'Search labels...' : ''}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        if (!open) {
                            setOpen(true);
                        }
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleInputKeyDown}
                />
            </div>
            {open && (
                <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-white shadow-md dark:bg-gray-950">
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
                                    onSearchClear={() => setSearch('')}
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
