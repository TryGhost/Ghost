import { badgeVariants, inputSurface } from '@tryghost/shade/components';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useDebounce } from 'use-debounce';
import { escapeNqlString } from '@tryghost/nql-string';
import { useBrowseTags, type Tag } from '@tryghost/admin-x-framework/api/tags';
import {
  availableTags,
  canCreateTag,
  isInternalTag,
  matchingTags,
  normalizeTagName,
  sameTag,
  tagKey,
  tagName,
  type PickedTag,
  type TagLike,
} from '@/shared/tags/tag-selection';

const SEARCH_DEBOUNCE_MS = 250;
const TAG_PAGE_LIMIT = '100';

interface TagPickerProps {
  selected: ReadonlyArray<TagLike>;
  onAdd: (tag: PickedTag) => void;
  onRemove: (key: string) => void;
  /** The accessible name of the field and of the list it opens. */
  inputLabel: string;
  /** Ties the input to a visible label the caller renders. */
  inputId?: string;
  /** Leaves the selected tags out of the list rather than listing them ticked. */
  hideSelected?: boolean;
  /** Holds the read until the list is first opened, so a field never opened reads nothing. */
  deferSearch?: boolean;
  requestOptions?: { sessionExpiryRedirect?: boolean };
  defaultErrorHandler?: boolean;
  /** Reports what is typed, for a caller that must know there is work to lose. */
  onSearchChange?: (search: string) => void;
  maxLength?: number;
  testIds?: { field?: string; input?: string; list?: string; token?: string };
}

/** A row in the list: an existing tag, or the offer to create what was typed. */
type PickerOption = { kind: 'tag'; tag: Tag } | { kind: 'create'; name: string };

/**
 * The chips-in-a-field tag picker, shared by the editor's settings sidebar and
 * the posts list's bulk "Add tags".
 *
 * The list is built by hand rather than with `cmdk`: cmdk only drives the
 * keyboard for an input inside its own tree, and this input sits in the chip
 * field above the list.
 */
export function TagPicker({
  selected,
  onAdd,
  onRemove,
  inputLabel,
  inputId,
  hideSelected = false,
  deferSearch = false,
  requestOptions,
  defaultErrorHandler,
  onSearchChange,
  maxLength,
  testIds,
}: TagPickerProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const term = normalizeTagName(search);
  const [debouncedTerm] = useDebounce(term, SEARCH_DEBOUNCE_MS);

  const { data, isFetching } = useBrowseTags({
    filter: {},
    enabled: deferSearch ? open : undefined,
    defaultErrorHandler,
    requestOptions,
    searchParams: {
      limit: TAG_PAGE_LIMIT,
      order: 'name asc',
      // No row shows a post count, so the join behind one is wasted per keystroke.
      include: '',
      ...(debouncedTerm ? { filter: `tags.name:~${escapeNqlString(debouncedTerm)}` } : {}),
    },
  });
  const tags = data?.tags ?? [];

  const updateSearch = (value: string) => {
    setSearch(value);
    onSearchChange?.(value);
  };

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  // The term goes with the list when the writer leaves the field: left behind,
  // it reads as an edit that nothing will ever commit.
  const closeAndDiscard = useCallback(() => {
    setOpen(false);
    setSearch('');
    onSearchChange?.('');
  }, [onSearchChange]);

  // Not a Radix Popover: portalled, it would sit outside a Dialog's subtree
  // where the scroll-lock blocks it. Closing on `pointerdown` without
  // preventing the default lets the `click` that follows reach what is under
  // the list, which is how one click on the bulk dialog's Add both works.
  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeAndDiscard();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [closeAndDiscard, open]);

  // On the document, not the input: clicking a row with the mouse moves focus
  // off the input, and an Escape after that never reached a handler bound there.
  // Escape backs out of the list only; the term stays for the caller that reads
  // it to decide whether the writer has work to lose.
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) {
        return;
      }
      if (event.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [close, open]);

  // Back to the top whenever the list narrows, so the highlight never points
  // past the end of what is on screen.
  useEffect(() => {
    setHighlighted(0);
  }, [term]);

  const matches = hideSelected ? availableTags(tags, selected, term) : matchingTags(tags, term);
  // Held back until the server has answered for what is typed, or a term still
  // being searched would offer to create a tag that already exists.
  const searchSettled = !isFetching && term === debouncedTerm;
  const options: PickerOption[] = [
    ...matches.map((tag) => ({ kind: 'tag' as const, tag })),
    ...(searchSettled && canCreateTag(term, matches, selected)
      ? [{ kind: 'create' as const, name: term }]
      : []),
  ];
  // A pick can shrink the list under the highlight, which leaves the stored
  // index past the end until the next arrow key moves it.
  const highlightedIndex = Math.min(highlighted, Math.max(options.length - 1, 0));

  // Keeps the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-highlighted="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  const choose = (option: PickerOption) => {
    if (option.kind === 'tag') {
      const chosen = selected.find((tag) => sameTag(tag, option.tag));

      if (chosen) {
        onRemove(tagKey(chosen));
      } else {
        onAdd({ id: option.tag.id, name: option.tag.name, slug: option.tag.slug });
      }
    } else {
      onAdd({ name: option.name });
    }
    // Cleared either way: leaving the term in the field means the next thing
    // typed appends to a search already acted on.
    updateSearch('');
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    // IME confirmation and candidate navigation belong to the input method.
    // Safari can end composition before its confirmation keydown, reporting 229.
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
      return;
    }

    // Backspace on an empty field removes the last chip, as the members picker
    // does — the chips are otherwise only removable by mouse.
    if (event.key === 'Backspace' && search === '' && selected.length > 0) {
      onRemove(tagKey(selected[selected.length - 1]));
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

        setHighlighted((highlightedIndex + step + options.length) % options.length);
      }

      return;
    }

    // Tab commits the highlighted row rather than moving on and dropping what
    // was typed. With nothing typed there is nothing to lose, so it keeps its
    // own job and moves focus out of the field.
    const commits = event.key === 'Enter' || (event.key === 'Tab' && term !== '');

    if (commits && open && options[highlightedIndex]) {
      event.preventDefault();
      choose(options[highlightedIndex]);
    }
  };

  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          closeAndDiscard();
        }
      }}
    >
      <div
        className={cn(
          inputSurface('within'),
          'flex min-h-9 w-full cursor-text flex-wrap items-center gap-1.5 px-3 py-1 text-control',
        )}
        data-testid={testIds?.field ?? 'tag-picker'}
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {/* The whole chip removes, so it is the button rather than carrying one. */}
        {selected.map((tag) => (
          <button
            key={tagKey(tag)}
            aria-label={`Remove ${tagName(tag)}`}
            className={cn(
              badgeVariants({ variant: isInternalTag(tag) ? 'default' : 'secondary' }),
              'cursor-pointer gap-1 pr-1',
            )}
            data-testid={testIds?.token}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove(tagKey(tag));
            }}
          >
            {tagName(tag)}
            <LucideIcon.X className="size-3" />
          </button>
        ))}
        <input
          ref={inputRef}
          aria-activedescendant={
            open && options[highlightedIndex] ? optionId(highlightedIndex) : undefined
          }
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          // A visible label the caller renders is the accessible name; a second
          // one here would shadow it.
          aria-label={inputId ? undefined : inputLabel}
          className="min-w-20 flex-1 bg-transparent text-control outline-hidden placeholder:text-muted-foreground"
          data-testid={testIds?.input}
          id={inputId}
          maxLength={maxLength}
          placeholder={selected.length === 0 ? 'Select or enter tags...' : ''}
          role="combobox"
          value={search}
          onChange={(event) => {
            updateSearch(event.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {/* Says the field opens a list; without it a bordered box with a
            placeholder reads as a plain text input. */}
        <LucideIcon.ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </div>
      {open && (
        <div
          ref={listRef}
          aria-label={inputLabel}
          className="absolute top-full left-0 z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border/60 bg-surface-elevated-2 p-1 text-popover-foreground shadow-md dark:border-border/30"
          data-testid={testIds?.list}
          id={listId}
          role="listbox"
        >
          {options.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No tags found</div>
          )}
          {options.map((option, index) => {
            const isHighlighted = index === highlightedIndex;
            const isChosen =
              option.kind === 'tag' && selected.some((tag) => sameTag(tag, option.tag));

            return (
              <div
                key={option.kind === 'tag' ? option.tag.id : 'create'}
                aria-selected={isChosen}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                  isHighlighted && 'bg-accent text-accent-foreground',
                )}
                data-highlighted={isHighlighted}
                id={optionId(index)}
                role="option"
                onClick={() => choose(option)}
                // Keeps focus in the input, which clicking a plain div would
                // otherwise drop, so typing and Escape both still work after a pick.
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
                    {/* Names are not unique; the slug is what tells two of them apart. */}
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
