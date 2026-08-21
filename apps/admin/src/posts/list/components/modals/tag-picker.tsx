import { Badge } from '@tryghost/shade/components';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { tagKey, type TagToAdd } from '@/posts/list/components/modals/tag-selection';
import type { Tag } from '@tryghost/admin-x-framework/api/tags';

interface TagPickerProps {
  /** Every tag on the site, already ordered for display. */
  tags: Tag[];
  selected: TagToAdd[];
  onToggle: (tag: TagToAdd) => void;
  /**
   * Reports whether anything has been typed, so the dialog can refuse to
   * close on Escape while there is work to lose. The chips it already knows
   * about; the search term lives in here.
   */
  onSearchChange?: (search: string) => void;
}

/**
 * A tag is internal when its visibility says so. A name the user has typed
 * counts too: Ghost's own rule is that a leading `#` makes a tag internal, and
 * the server applies it on create — so the chip should say so before the save
 * rather than changing appearance afterwards.
 */
function isInternalTag(tag: { name: string; visibility?: string }): boolean {
  return tag.visibility === 'internal' || tag.name.startsWith('#');
}

/**
 * Internal tags read as a solid dark chip and public ones as an outline, as
 * Ember styles them. Adding tags in bulk is exactly where the difference
 * matters: an internal tag changes nothing a reader sees, and mistaking one for
 * a public one means quietly publishing a label you meant to keep private.
 */
function tagBadgeVariant(tag: { name: string; visibility?: string }) {
  return isInternalTag(tag) ? ('default' as const) : ('secondary' as const);
}

/** A row in the list: an existing tag, or the offer to create what was typed. */
type PickerOption = { kind: 'tag'; tag: Tag } | { kind: 'create'; name: string };

/**
 * The chips-in-a-field tag picker, modelled on the members label picker but
 * add-only: tags already on the posts are not shown and nothing here edits or
 * deletes a tag, because this dialog can only add.
 *
 * The list is built by hand rather than with `cmdk`, which the members picker
 * uses. cmdk only drives the keyboard for an input inside its own tree, and
 * this input sits in the chip field above the list — so arrow keys did nothing.
 * Owning the list also means the highlight covers the "Create" row, which is
 * where you want to be after typing a name that does not exist yet.
 */
export function TagPicker({ tags, selected, onToggle, onSearchChange }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Dismissed by a plain document listener rather than a Radix Popover. Two
  // reasons: a portalled popover would sit outside the Dialog's subtree,
  // where its scroll-lock blocks interaction; and closing on `pointerdown`
  // without preventing the default means the `click` that follows still lands
  // on whatever is underneath. The list covers the dialog's own footer, so
  // that is what lets a single click on Add both close the list and press it.
  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  // Escape closes the list. Bound to the document rather than the input
  // because it must not depend on where focus happens to be — clicking a row
  // with the mouse moves focus off the input, and an Escape after that never
  // reached a handler bound there.
  //
  // Whether the *dialog* also closes is not decided here: the modal answers
  // that through Radix's own `onEscapeKeyDown`, which is the supported way and
  // avoids racing two capture-phase listeners on the same node.
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open]);

  // Back to the top whenever the list narrows, so the highlight never points
  // past the end of what is on screen.
  useEffect(() => {
    setHighlighted(0);
  }, [search]);

  // Keeps the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-highlighted="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, open]);

  const term = search.trim();
  const selectedKeys = new Set(selected.map(tagKey));
  const matches = term
    ? tags.filter((tag) => tag.name.toLowerCase().includes(term.toLowerCase()))
    : tags;

  // Offered only when nothing existing carries that name — otherwise
  // "Create" would make a duplicate of something one row below it.
  const canCreate =
    term.length > 0 && !tags.some((tag) => tag.name.toLowerCase() === term.toLowerCase());

  const options: PickerOption[] = [
    ...matches.map((tag) => ({ kind: 'tag' as const, tag })),
    ...(canCreate ? [{ kind: 'create' as const, name: term }] : []),
  ];

  const updateSearch = (value: string) => {
    setSearch(value);
    onSearchChange?.(value);
  };

  const choose = (option: PickerOption) => {
    onToggle(
      option.kind === 'tag'
        ? { id: option.tag.id, name: option.tag.name, slug: option.tag.slug }
        : { name: option.name },
    );
    // Cleared either way: leaving the term in the field means the next
    // thing typed appends to a search already acted on.
    updateSearch('');
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    // Backspace on an empty field removes the last chip, as the members
    // picker does — the chips are otherwise only removable by mouse.
    if (event.key === 'Backspace' && !search && selected.length > 0) {
      onToggle(selected[selected.length - 1]);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      if (!open) {
        setOpen(true);
        return;
      }

      if (options.length > 0) {
        const step = event.key === 'ArrowDown' ? 1 : -1;

        setHighlighted((current) => (current + step + options.length) % options.length);
      }

      return;
    }

    if (event.key === 'Enter' && open && options[highlighted]) {
      event.preventDefault();
      choose(options[highlighted]);

      return;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 rounded-md border border-control-border bg-control-surface px-3 py-1 text-control transition-colors focus-within:border-focus-ring focus-within:ring-2 focus-within:ring-focus-ring/25"
        data-testid="tag-picker"
        role="combobox"
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {selected.map((tag) => (
          <Badge
            key={tagKey(tag)}
            className="cursor-pointer gap-1 pr-1"
            variant={tagBadgeVariant(tag)}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(tag);
            }}
          >
            {tag.name}
            <LucideIcon.X className="size-3" />
          </Badge>
        ))}
        <input
          ref={inputRef}
          aria-label="Search tags"
          className="min-w-20 flex-1 bg-transparent text-control outline-hidden placeholder:text-muted-foreground"
          placeholder={selected.length === 0 ? 'Select or enter tags...' : ''}
          value={search}
          onChange={(event) => {
            updateSearch(event.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {/* Says the field opens a list. Without it, a bordered box with
                    a placeholder reads as a plain text input. */}
        <LucideIcon.ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </div>
      {open && (
        <div
          ref={listRef}
          className="absolute top-full left-0 z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-surface-elevated p-1 shadow-md"
          role="listbox"
        >
          {options.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No tags found</div>
          )}
          {options.map((option, index) => {
            const isHighlighted = index === highlighted;
            const isChosen = option.kind === 'tag' && selectedKeys.has(option.tag.id);

            return (
              <div
                key={option.kind === 'tag' ? option.tag.id : 'create'}
                aria-selected={isChosen}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                  isHighlighted && 'bg-accent text-accent-foreground',
                )}
                data-highlighted={isHighlighted}
                role="option"
                onClick={() => choose(option)}
                // Keeps focus in the input, which clicking a
                // plain div would otherwise drop. Two things
                // depend on it: you can keep typing after
                // picking, and Escape still reaches the handler
                // above rather than going straight to Radix.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlighted(index)}
              >
                {option.kind === 'create' ? (
                  <>
                    <LucideIcon.Plus className="size-4 shrink-0" />
                    <span className="truncate">Create “{option.name}”</span>
                  </>
                ) : (
                  <>
                    <span className={cn('truncate', isInternalTag(option.tag) && 'font-medium')}>
                      {option.tag.name}
                    </span>
                    {/* Names are not unique; the slug is
                                            what tells two of them apart. */}
                    <span className="ms-auto truncate font-mono text-xs text-muted-foreground">
                      {option.tag.slug}
                    </span>
                    {isChosen && <LucideIcon.Check className="size-4 shrink-0 text-primary" />}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
