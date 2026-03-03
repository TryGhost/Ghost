import React, {useEffect, useRef, useState} from 'react';
import {
    Badge,
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandSeparator,
    LucideIcon,
    Popover,
    PopoverAnchor,
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
    const inputRef = useRef<HTMLInputElement>(null);

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
        await onSave(label.id, name.trim());
        onCancel();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    };

    const handleDelete = async () => {
        await onDelete(label.id);
    };

    if (showDeleteConfirm) {
        return (
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-sm" data-edit-row>
                <span className="flex-1 truncate text-destructive">Delete this label?</span>
                <button
                    className="rounded px-1.5 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                    type="button"
                    onClick={handleDelete}
                >
                    Delete
                </button>
                <button
                    className="rounded px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                >
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <div className="relative flex items-center gap-1.5 px-2 py-1" data-edit-row>
            <input
                ref={inputRef}
                className="h-7 flex-1 rounded border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                type="text"
                value={name}
                onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                }}
                onKeyDown={handleKeyDown}
            />
            <button
                className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
                title="Save"
                type="button"
                onClick={handleSave}
            >
                <LucideIcon.Check className="size-3.5" />
            </button>
            <button
                className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
                title="Cancel"
                type="button"
                onClick={onCancel}
            >
                <LucideIcon.X className="size-3.5" />
            </button>
            <button
                className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Delete"
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
            >
                <LucideIcon.Trash2 className="size-3.5" />
            </button>
            {error && <span className="absolute -bottom-5 left-2 text-xs text-destructive">{error}</span>}
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
                className="relative ml-1 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onEditClick();
                }}
            >
                {isSelected && (
                    <LucideIcon.Check className="absolute size-3 text-primary transition-opacity group-hover:opacity-0" />
                )}
                <LucideIcon.Pencil className="absolute size-3 opacity-0 transition-opacity group-hover:opacity-100" />
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
            <CommandEmpty>No labels found</CommandEmpty>
            <CommandGroup>
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
            {showCreate && (
                <>
                    <CommandSeparator />
                    <CommandGroup>
                        <CommandItem
                            disabled={isCreating}
                            onSelect={handleCreate}
                        >
                            <LucideIcon.Plus className="mr-1 size-4" />
                            {isCreating ? 'Creating...' : `Create "${search.trim()}"`}
                        </CommandItem>
                    </CommandGroup>
                </>
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
        const triggerText = selectedLabels.length === 0
            ? 'Select...'
            : selectedLabels.length === 1
                ? selectedLabels[0].name
                : `${selectedLabels.length} labels`;

        return (
            <Popover>
                <PopoverTrigger asChild>
                    <button
                        className="flex size-full items-center truncate text-left text-sm"
                        type="button"
                    >
                        {triggerText}
                    </button>
                </PopoverTrigger>
                <PopoverContent align={align} className="w-64 p-0">
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
    }

    // --- Default mode (for modals): combobox-like input with chips + dropdown ---
    return (
        <ComboboxPicker
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
            <CommandList>
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
    align?: 'start' | 'end';
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
    align = 'start',
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
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverAnchor asChild>
                <div
                    className="flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
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
            </PopoverAnchor>
            <PopoverContent
                align={align}
                className="w-[var(--radix-popover-trigger-width)] p-0"
                onOpenAutoFocus={(e) => {
                    e.preventDefault();
                }}
            >
                {isLoading ? (
                    <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                        Loading labels...
                    </div>
                ) : (
                    <Command shouldFilter={false}>
                        <CommandList>
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
            </PopoverContent>
        </Popover>
    );
};

export default LabelPicker;
