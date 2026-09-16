import { badgeVariants, inputSurface } from '@tryghost/shade/components';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';

/** Trailing and leading space is never part of what is picked. */
const trimTerm = (search: string) => search.trim();

/** The offer to commit what was typed as something the list does not hold yet. */
export interface ChipPickerCreateRow<TOption> {
  /** Whether the term is worth offering, given the rows already on screen. */
  offer: (term: string, offered: readonly TOption[]) => boolean;
  render: (term: string) => ReactNode;
  onSelect: (term: string) => void;
}

export interface ChipPickerTestIds {
  field?: string;
  input?: string;
  list?: string;
  chip?: string;
}

export interface ChipPickerProps<TOption, TChip> {
  /** Everything the list can offer, in the order it should read. */
  options: ReadonlyArray<TOption>;
  /** What the field already carries, in the order it should read. */
  selected: ReadonlyArray<TChip>;
  getKey: (item: TOption | TChip) => string;
  getLabel: (item: TOption | TChip) => string;
  /** Whether a row is a chip the field already carries. Keys are the default test. */
  isChosen?: (option: TOption, chip: TChip) => boolean;
  renderOption?: (option: TOption, state: { chosen: boolean }) => ReactNode;
  chipVariant?: (chip: TChip) => 'default' | 'secondary';
  onAdd: (option: TOption) => void;
  onRemove: (key: string) => void;
  /** Leaves the chosen rows out of the list rather than listing them ticked. */
  hideSelected?: boolean;
  /** Narrows the rows by the typed term, for a list the server has not narrowed. */
  matches?: (option: TOption, term: string) => boolean;
  /** Reduces what is typed to the term the rows and the create offer read against. */
  normalizeTerm?: (search: string) => string;
  createRow?: ChipPickerCreateRow<TOption>;
  /** Reports what is typed, for a caller that must know there is work to lose. */
  onSearchChange?: (search: string) => void;
  onOpenChange?: (open: boolean) => void;
  /** Opens the list again on the row a Backspace removal handed back. */
  reopenOnRemove?: boolean;
  /** Stands in for the rows, for a list with nothing it can offer. */
  notice?: ReactNode;
  /** Hands the caller the search input, for a notice that puts focus back on it. */
  inputRef?: RefObject<HTMLInputElement>;
  emptyMessage: string;
  placeholder: string;
  /** The accessible name of the field and of the list it opens. */
  inputLabel: string;
  /** Ties the input to a visible label the caller renders. */
  inputId?: string;
  describedBy?: string;
  invalid?: boolean;
  maxLength?: number;
  testIds?: ChipPickerTestIds;
}

type Row<TOption> =
  | { kind: 'option'; key: string; option: TOption; chosen: boolean }
  | { kind: 'create'; key: string };

/**
 * The chips-in-a-field picker: what the field carries drawn as removable chips,
 * and a list of what else it could carry under a search input.
 *
 * The list is built by hand rather than with `cmdk`: cmdk only drives the
 * keyboard for an input inside its own tree, and this input sits in the chip
 * field above the list.
 */
export function ChipPicker<TOption, TChip>({
  options,
  selected,
  getKey,
  getLabel,
  isChosen,
  renderOption,
  chipVariant,
  onAdd,
  onRemove,
  hideSelected = false,
  matches,
  normalizeTerm = trimTerm,
  createRow,
  onSearchChange,
  onOpenChange,
  reopenOnRemove = false,
  notice,
  inputRef,
  emptyMessage,
  placeholder,
  inputLabel,
  inputId,
  describedBy,
  invalid,
  maxLength,
  testIds,
}: ChipPickerProps<TOption, TChip>) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const ownInputRef = useRef<HTMLInputElement>(null);
  const input = inputRef ?? ownInputRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // One term behind the rows and the create offer, and behind whatever the
  // caller queries with: a caller that normalises differently hands its own in.
  const term = normalizeTerm(search);

  const updateSearch = (value: string) => {
    setSearch(value);
    onSearchChange?.(value);
  };

  const reveal = () => {
    setOpen(true);
    onOpenChange?.(true);
  };

  // Backs out of the list only: the term stays for the caller that reads it.
  const close = useCallback(() => {
    setOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  // The term goes with the list when the writer leaves the field: left behind,
  // it reads as an edit that nothing will ever commit.
  const closeAndDiscard = useCallback(() => {
    setOpen(false);
    onOpenChange?.(false);
    setSearch('');
    onSearchChange?.('');
  }, [onOpenChange, onSearchChange]);

  // Not a Radix Popover: portalled, it would sit outside a Dialog's subtree
  // where the scroll-lock blocks it. Closing on `pointerdown` without
  // preventing the default lets the `click` that follows reach what is under it.
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
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) {
        return;
      }
      // Capture runs after any Radix layer and before an enclosing pane's bubble
      // listener; claiming the key keeps the pane from closing with the list.
      if (event.key === 'Escape') {
        event.preventDefault();
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

  const chipFor = (option: TOption) =>
    selected.find((chip) => (isChosen ? isChosen(option, chip) : getKey(option) === getKey(chip)));

  const narrowed =
    matches && term !== '' ? options.filter((option) => matches(option, term)) : options;
  const offered = hideSelected ? narrowed.filter((option) => !chipFor(option)) : narrowed;
  const rows: Row<TOption>[] = notice
    ? []
    : [
        ...offered.map((option) => ({
          kind: 'option' as const,
          key: getKey(option),
          option,
          chosen: Boolean(chipFor(option)),
        })),
        ...(createRow?.offer(term, offered) ? [{ kind: 'create' as const, key: 'create' }] : []),
      ];

  // A pick can shrink the list under the highlight, which leaves the stored
  // index past the end until the next arrow key moves it.
  const highlightedIndex = Math.min(highlighted, Math.max(rows.length - 1, 0));

  // Keeps the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-highlighted="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  const choose = (row: Row<TOption>) => {
    if (row.kind === 'create') {
      createRow?.onSelect(term);
    } else {
      const chip = chipFor(row.option);

      if (chip) {
        onRemove(getKey(chip));
      } else {
        onAdd(row.option);
      }
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

    // Backspace on an empty field removes the last chip — the chips are
    // otherwise only removable by mouse.
    if (event.key === 'Backspace' && search === '' && selected.length > 0) {
      onRemove(getKey(selected[selected.length - 1]));

      if (reopenOnRemove) {
        reveal();
      }

      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      if (!open) {
        reveal();
        return;
      }

      if (rows.length > 0) {
        const step = event.key === 'ArrowDown' ? 1 : -1;

        setHighlighted((highlightedIndex + step + rows.length) % rows.length);
      }

      return;
    }

    // Tab commits the highlighted row rather than moving on and dropping what
    // was typed. With nothing typed there is nothing to lose, so it keeps its
    // own job and moves focus out of the field.
    const commits = event.key === 'Enter' || (event.key === 'Tab' && term !== '');

    if (commits && open && rows[highlightedIndex]) {
      event.preventDefault();
      choose(rows[highlightedIndex]);
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
        data-testid={testIds?.field}
        onClick={() => {
          input.current?.focus();
          reveal();
        }}
      >
        {/* The whole chip removes, so it is the button rather than carrying one. */}
        {selected.map((chip) => (
          <button
            key={getKey(chip)}
            aria-label={`Remove ${getLabel(chip)}`}
            className={cn(
              badgeVariants({ variant: chipVariant?.(chip) ?? 'default' }),
              'cursor-pointer gap-1 pr-1',
            )}
            data-testid={testIds?.chip}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove(getKey(chip));
            }}
          >
            {getLabel(chip)}
            <LucideIcon.X className="size-3" />
          </button>
        ))}
        <input
          ref={input}
          aria-activedescendant={
            open && rows[highlightedIndex] ? optionId(highlightedIndex) : undefined
          }
          aria-autocomplete="list"
          // Named only while the list it names is on screen.
          aria-controls={open ? listId : undefined}
          aria-describedby={describedBy}
          aria-expanded={open}
          aria-invalid={invalid}
          // A visible label the caller renders is the accessible name; a second
          // one here would shadow it.
          aria-label={inputId ? undefined : inputLabel}
          className="min-w-20 flex-1 bg-transparent text-control outline-hidden placeholder:text-muted-foreground"
          data-testid={testIds?.input}
          id={inputId}
          maxLength={maxLength}
          placeholder={selected.length === 0 ? placeholder : ''}
          role="combobox"
          value={search}
          onChange={(event) => {
            updateSearch(event.target.value);
            reveal();
          }}
          onKeyDown={handleKeyDown}
        />
        {/* Says the field opens a list; without it a bordered box with a
            placeholder reads as a plain text input. */}
        <LucideIcon.ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </div>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border/60 bg-surface-elevated-2 p-1 text-popover-foreground shadow-md dark:border-border/30">
          {notice}
          <div
            ref={listRef}
            aria-label={inputLabel}
            data-testid={testIds?.list}
            id={listId}
            role="listbox"
          >
            {!notice && rows.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">{emptyMessage}</div>
            )}
            {rows.map((row, index) => {
              const isHighlighted = index === highlightedIndex;
              const chosen = row.kind === 'option' && row.chosen;

              return (
                <div
                  key={row.key}
                  aria-selected={chosen}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
                    isHighlighted && 'bg-accent text-accent-foreground',
                  )}
                  data-highlighted={isHighlighted}
                  id={optionId(index)}
                  role="option"
                  onClick={() => choose(row)}
                  // Keeps focus in the input, which clicking a plain div would
                  // otherwise drop, so typing and Escape both still work after a pick.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlighted(index)}
                >
                  {row.kind === 'create'
                    ? createRow?.render(term)
                    : (renderOption?.(row.option, { chosen }) ?? (
                        <span className="truncate">{getLabel(row.option)}</span>
                      ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
