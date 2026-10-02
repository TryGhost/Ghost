import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Badge,
  tokenFieldClasses,
  type ComboboxOptionSource,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@tryghost/shade/components';
import { useShade } from '@tryghost/shade/app';
import { EditRow } from './edit-row';
import { type Label } from '@tryghost/admin-x-framework/api/labels';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { canCreateLabel } from './can-create-label';

// What the list used to be capped at (max-h-64), and the least worth showing rather than
// collapsing to a sliver. Between them it takes whatever room is below the field.
const PREFERRED_HEIGHT = 256;
const MIN_HEIGHT = 120;
// Between the field and the scrollable list: the dropdown's mt-1 offset and its border. The
// space is measured from the field, so this is spent before the list gets any of it.
const DROPDOWN_CHROME = 6;
// Kept clear of the viewport edge so the list never sits flush against it.
const GUTTER = 16;

type PickerLabel = Pick<Label, 'id' | 'name' | 'slug'> & {
  /** Optional heading for related options; omitted for a flat label list. */
  group?: string;
};

export interface LabelPickerProps {
  labels: PickerLabel[];
  optionSource: ComboboxOptionSource<string>;
  selectedSlugs: string[];
  resolvedSelectedLabels?: PickerLabel[];
  onToggle: (slug: string) => void;
  // Creation
  onCreate?: (name: string) => Promise<Label | undefined>;
  isCreating?: boolean;
  // Editing
  onEdit?: (id: string, name: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  // Placeholder shown in the search input when nothing is selected. Defaults
  // to 'Search labels...' — pass an empty string on surfaces where the field
  // itself is already contextualized by a nearby Label element.
  placeholder?: string;
}

// --- LabelRow: single label item with overlapping check/edit icon ---

interface LabelRowProps {
  label: PickerLabel;
  isSelected: boolean;
  showEdit: boolean;
  onToggle: (slug: string) => void;
  onEditClick: () => void;
}

const LabelRow: React.FC<LabelRowProps> = ({
  label,
  isSelected,
  showEdit,
  onToggle,
  onEditClick,
}) => (
  <CommandItem className="group" value={label.slug} onSelect={() => onToggle(label.slug)}>
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
  labels: PickerLabel[];
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
  onSearchClear,
}) => {
  const { isAdmin7 } = useShade();
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const normalizedSearch = search.trim().toLowerCase();
  const visibleLabels = normalizedSearch
    ? labels.filter((label) => label.name.toLowerCase().includes(normalizedSearch))
    : labels;
  const showCreate = !!onCreate && canCreateLabel(labels, search);
  const groups = new Map<string, PickerLabel[]>();
  for (const label of visibleLabels) {
    const group = label.group ?? '';
    const groupLabels = groups.get(group) ?? [];
    groupLabels.push(label);
    groups.set(group, groupLabels);
  }
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
      {!showCreate && visibleLabels.length === 0 && <CommandEmpty>No labels found</CommandEmpty>}
      {[...groups].map(([group, groupLabels], index) => (
        <React.Fragment key={group}>
          {index > 0 && <CommandSeparator className="my-1" />}
          <CommandGroup className={cn(isAdmin7 && 'p-0')} heading={group || undefined}>
            {groupLabels.map((label) =>
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
              ),
            )}
          </CommandGroup>
        </React.Fragment>
      ))}
      {showCreate && (
        <CommandGroup className={cn('[&_[cmdk-group-heading]]:hidden', isAdmin7 && 'p-0')}>
          <CommandItem disabled={isCreating} onSelect={() => void handleCreate()}>
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
  labels: PickerLabel[];
  onToggle: (slug: string) => void;
}

const SelectedPills: React.FC<SelectedPillsProps> = ({ labels, onToggle }) => {
  const { isAdmin7 } = useShade();
  return (
    <>
      {labels.map((label) => (
        <Badge
          key={label.id}
          className={cn(
            'cursor-pointer gap-1 pr-1',
            isAdmin7 && cn(tokenFieldClasses.chip, 'bg-secondary'),
          )}
          variant="outline"
          asChild
        >
          <button
            aria-label={`Remove ${label.name}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(label.slug);
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {label.name}
            <LucideIcon.X className="size-3" />
          </button>
        </Badge>
      ))}
    </>
  );
};

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
  onDelete,
  placeholder,
}) => {
  const selectedLabels =
    resolvedSelectedLabels ||
    selectedSlugs
      .map((slug) => labels.find((l) => l.slug === slug))
      .filter((l): l is PickerLabel => !!l);

  return (
    <ComboboxPicker
      isCreating={isCreating}
      labels={labels}
      optionSource={optionSource}
      placeholder={placeholder}
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
  labels: PickerLabel[];
  optionSource: ComboboxOptionSource<string>;
  selectedLabels: PickerLabel[];
  selectedSlugs: string[];
  onToggle: (slug: string) => void;
  onCreate?: (name: string) => Promise<Label | undefined>;
  isCreating?: boolean;
  onEdit?: (id: string, name: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  placeholder?: string;
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
  onDelete,
  placeholder = 'Search labels...',
}) => {
  const { isAdmin7 } = useShade();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState(PREFERRED_HEIGHT);

  // No portal here (see the click-outside note below), so nothing anchors this for us: at a
  // fixed height the list runs off-screen when the field sits low in a tall dialog. Opens
  // downward as it always has and takes whatever room is below, scrolling inside it.
  // Selecting labels wraps the field to another row and moves it, so that counts too.
  useLayoutEffect(() => {
    if (!open || !containerRef.current) {
      return;
    }
    const spaceBelow =
      window.innerHeight -
      containerRef.current.getBoundingClientRect().bottom -
      DROPDOWN_CHROME -
      GUTTER;
    setMaxHeight(Math.max(MIN_HEIGHT, Math.min(PREFERRED_HEIGHT, spaceBelow)));
  }, [open, selectedSlugs.length]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      optionSource.onSearchChange?.(value);
    },
    [optionSource],
  );

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

  // Intercept Escape before the containing Radix dialog's document listener.
  // The first press dismisses suggestions while keeping the search field focused.
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && event.target === inputRef.current) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [open]);

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !search && selectedSlugs.length > 0) {
      onToggle(selectedSlugs[selectedSlugs.length - 1]);
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Command
        className="h-auto overflow-visible [&_[data-slot=command-input]]:contents [&_[data-slot=command-input]>svg]:hidden"
        label={placeholder || 'Labels'}
        shouldFilter={false}
      >
        <div
          className={cn(
            isAdmin7
              ? tokenFieldClasses.field
              : 'flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border border-control-border bg-control-surface px-3 py-1 text-control transition-colors focus-within:border-focus-ring focus-within:ring-2 focus-within:ring-focus-ring/25',
            'relative pr-8',
          )}
          onClick={() => {
            inputRef.current?.focus();
            setOpen(true);
          }}
        >
          <SelectedPills
            labels={selectedLabels}
            onToggle={(slug) => {
              onToggle(slug);
              inputRef.current?.focus();
            }}
          />
          <CommandInput
            className={cn(
              'size-auto rounded-none py-0',
              isAdmin7
                ? tokenFieldClasses.input
                : 'min-w-20 flex-1 bg-transparent text-control outline-hidden placeholder:text-muted-foreground',
            )}
            value={search}
            asChild
            onFocus={() => setOpen(true)}
            onKeyDown={handleInputKeyDown}
            onValueChange={(value) => {
              handleSearchChange(value);
              if (!open) {
                setOpen(true);
              }
            }}
          >
            <input
              ref={inputRef}
              aria-expanded={open}
              placeholder={selectedLabels.length === 0 ? placeholder : ''}
            />
          </CommandInput>
          <LucideIcon.ChevronDown
            className={cn(tokenFieldClasses.chevron, !isAdmin7 && 'top-2.5')}
          />
        </div>
        {open && (
          <div
            className={cn(
              'absolute top-full left-0 z-50 mt-1 w-full border bg-white shadow-md dark:bg-gray-950',
              isAdmin7 ? 'rounded-menu' : 'rounded-md',
            )}
          >
            {optionSource.isInitialLoad ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                Loading labels...
              </div>
            ) : (
              <CommandList className="overflow-y-auto" style={{ maxHeight }}>
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
            )}
          </div>
        )}
      </Command>
    </div>
  );
};

export default LabelPicker;
