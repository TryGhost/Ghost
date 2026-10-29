import {
  closestCenter,
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DraggableSyntheticListeners,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react-dom';
import { Badge, type BadgeProps, tokenFieldClasses } from '@tryghost/shade/components';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode, RefObject } from 'react';

/** Trailing and leading space is never part of what is picked. */
const trimTerm = (search: string) => search.trim();

/** Within two rows of the end, so the next page is on its way before the last row shows. */
const END_REACHED_PX = 64;

/** The list's tallest, as `max-h-64` held it before it was positioned by hand. */
const LIST_MAX_HEIGHT_PX = 256;

/** The room the list keeps from the viewport's edges. */
const VIEWPORT_GUTTER_PX = 16;

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
  /** Shown on hovering a row, for a detail the row leaves out. */
  getOptionTitle?: (option: TOption) => string | undefined;
  /** Heads runs of rows that share a group; options should already be ordered by it. */
  getGroup?: (option: TOption) => string | undefined;
  /** Outline on the secondary fill unless the caller picks another. */
  chipVariant?: (chip: TChip) => BadgeProps['variant'];
  chipClassName?: (chip: TChip) => string | undefined;
  /** Shown on hovering a chip, for a detail the chip leaves out. */
  getChipTitle?: (chip: TChip) => string | undefined;
  onAdd: (option: TOption) => void;
  onRemove: (key: string) => void;
  /** Lets the chips be dragged into a new order, handed back whole. */
  onReorder?: (next: TChip[]) => void;
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
  /** Asks for more rows once the list is scrolled near its end, for a list read a page at a time. */
  onEndReached?: () => void;
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

interface RowSection<TOption> {
  group: string | undefined;
  rows: Array<{ row: Row<TOption>; index: number }>;
}

/** Consecutive rows that share a group, each row keeping its place in the flat list the keyboard walks. */
function sectionRows<TOption>(
  rows: Row<TOption>[],
  getGroup: ((option: TOption) => string | undefined) | undefined,
): RowSection<TOption>[] {
  const sections: RowSection<TOption>[] = [];

  rows.forEach((row, index) => {
    const group = row.kind === 'option' ? getGroup?.(row.option) : undefined;
    const last = sections[sections.length - 1];

    if (last && last.group === group) {
      last.rows.push({ row, index });
    } else {
      sections.push({ group, rows: [{ row, index }] });
    }
  });

  return sections;
}

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
  getOptionTitle,
  getGroup,
  chipVariant,
  chipClassName,
  getChipTitle,
  onAdd,
  onRemove,
  onReorder,
  hideSelected = false,
  matches,
  normalizeTerm = trimTerm,
  createRow,
  onSearchChange,
  onOpenChange,
  onEndReached,
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
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Fixed rather than absolute, so a list wider than the field is not clipped
  // by a scrolling or overflow-hidden ancestor such as the editor's sidebar.
  // It stays in the picker's subtree, which the outside-pointer and blur
  // checks, and an enclosing Dialog's scroll-lock, all rely on.
  const { refs, floatingStyles } = useFloating({
    open,
    placement: 'bottom-end',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ padding: VIEWPORT_GUTTER_PX }),
      shift({ padding: VIEWPORT_GUTTER_PX }),
      size({
        padding: VIEWPORT_GUTTER_PX,
        apply({ availableHeight, elements, rects }) {
          Object.assign(elements.floating.style, {
            // Never narrower than the field, unless the field outgrows the viewport:
            // min-width beats the class's max-width, so it carries the gutter too.
            minWidth: `min(${rects.reference.width}px, calc(100vw - ${VIEWPORT_GUTTER_PX * 2}px))`,
            maxHeight: `${Math.min(LIST_MAX_HEIGHT_PX, availableHeight)}px`,
          });
        },
      }),
    ],
  });

  const setScroller = useCallback(
    (node: HTMLDivElement | null) => {
      scrollerRef.current = node;
      refs.setFloating(node);
    },
    [refs],
  );

  // Read at call time: with the handler in the end check's deps, every render
  // would ask again for a page that failed.
  const endReached = useRef(onEndReached);
  endReached.current = onEndReached;

  const reportEnd = useCallback(() => {
    const scroller = scrollerRef.current;

    if (
      scroller &&
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= END_REACHED_PX
    ) {
      endReached.current?.();
    }
  }, []);

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

  // A list too short to scroll never fires a scroll, so it is checked as it opens and changes.
  useEffect(() => {
    if (open) {
      reportEnd();
    }
  }, [open, reportEnd, rows.length]);

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
        ref={refs.setReference}
        className={cn(tokenFieldClasses.field, 'pr-8')}
        data-testid={testIds?.field}
        onClick={() => {
          input.current?.focus();
          reveal();
        }}
      >
        {/* The whole chip removes, so it is the button rather than carrying one. */}
        {onReorder ? (
          <ReorderableChips
            keys={selected.map(getKey)}
            labelFor={(key) => {
              const chip = selected.find((candidate) => getKey(candidate) === key);
              return chip ? getLabel(chip) : key;
            }}
            onMove={(from, to) => onReorder(arrayMove([...selected], from, to))}
          >
            {selected.map((chip) => (
              <SortableChip
                key={getKey(chip)}
                className={chipClassName?.(chip)}
                id={getKey(chip)}
                label={getLabel(chip)}
                testId={testIds?.chip}
                title={getChipTitle?.(chip)}
                variant={chipVariant?.(chip) ?? 'outline'}
                onRemove={() => onRemove(getKey(chip))}
              />
            ))}
          </ReorderableChips>
        ) : (
          selected.map((chip) => (
            <Chip
              key={getKey(chip)}
              className={chipClassName?.(chip)}
              label={getLabel(chip)}
              testId={testIds?.chip}
              title={getChipTitle?.(chip)}
              variant={chipVariant?.(chip) ?? 'outline'}
              onRemove={() => onRemove(getKey(chip))}
            />
          ))
        )}
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
          className={tokenFieldClasses.input}
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
        <LucideIcon.ChevronDown className={tokenFieldClasses.chevron} />
      </div>
      {open && (
        // As wide as its longest row, from the field's width up to 480px, past
        // which a row wraps: a long name reads whole rather than cut short.
        <div
          ref={setScroller}
          className="z-50 w-max max-w-[min(480px,calc(100vw-32px))] overflow-y-auto rounded-md border border-border/60 bg-surface-elevated-2 p-1 text-popover-foreground shadow-md dark:border-border/30"
          style={floatingStyles}
          onScroll={onEndReached ? reportEnd : undefined}
        >
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
            {sectionRows(rows, getGroup).map((section, sectionIndex) => {
              // A section is never empty, and its first row's key is unique in the list.
              const sectionKey = section.rows[0].row.key;
              const items = section.rows.map(({ row, index }) => {
                const isHighlighted = index === highlightedIndex;
                const chosen = row.kind === 'option' && row.chosen;

                return (
                  <div
                    key={row.key}
                    aria-selected={chosen}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-(length:--text-control) leading-5',
                      isHighlighted && 'bg-accent text-accent-foreground',
                    )}
                    data-highlighted={isHighlighted}
                    id={optionId(index)}
                    role="option"
                    title={row.kind === 'option' ? getOptionTitle?.(row.option) : undefined}
                    onClick={() => choose(row)}
                    // Keeps focus in the input, which clicking a plain div would
                    // otherwise drop, so typing and Escape both still work after a pick.
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlighted(index)}
                  >
                    {row.kind === 'create'
                      ? createRow?.render(term)
                      : (renderOption?.(row.option, { chosen }) ?? (
                          <OptionLabel>{getLabel(row.option)}</OptionLabel>
                        ))}
                  </div>
                );
              });

              if (section.group === undefined) {
                return <Fragment key={sectionKey}>{items}</Fragment>;
              }

              const headingId = `${listId}-group-${sectionIndex}`;

              return (
                <Fragment key={sectionKey}>
                  {sectionIndex > 0 && (
                    <div className="-mx-1 my-1 h-px bg-border" role="separator" />
                  )}
                  <div aria-labelledby={headingId} role="group">
                    <div
                      className="px-2 py-1.5 text-xs font-medium text-muted-foreground"
                      id={headingId}
                    >
                      {section.group}
                    </div>
                    {items}
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** A row's label, wrapping onto more lines rather than cut short. */
export function OptionLabel({ children }: { children: ReactNode }) {
  return <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>;
}

interface ChipProps {
  label: string;
  variant: BadgeProps['variant'];
  testId?: string;
  onRemove: () => void;
  setRef?: (element: HTMLElement | null) => void;
  listeners?: DraggableSyntheticListeners;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

function Chip({
  label,
  variant,
  testId,
  onRemove,
  setRef,
  listeners,
  className,
  style,
  title,
}: ChipProps) {
  return (
    <Badge
      className={cn(tokenFieldClasses.chip, 'bg-secondary', className)}
      variant={variant}
      asChild
    >
      <button
        ref={setRef}
        aria-label={`Remove ${label}`}
        data-testid={testId}
        style={style}
        title={title}
        type="button"
        {...listeners}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
      >
        <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
        {/* Level with the first line rather than the middle of a wrapped chip. */}
        <LucideIcon.X className="mt-0.5 size-3 shrink-0 self-start" />
      </button>
    </Badge>
  );
}

function SortableChip({ id, ...props }: ChipProps & { id: string }) {
  // The sortable attributes are left off: they would rename the button and
  // describe a keyboard drag that Enter and Space, which remove, never start.
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <Chip
      {...props}
      className={cn('touch-manipulation', isDragging && 'z-10', props.className)}
      listeners={listeners}
      setRef={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    />
  );
}

interface ReorderableChipsProps {
  keys: string[];
  labelFor: (key: string) => string;
  onMove: (from: number, to: number) => void;
  children: ReactNode;
}

// No keyboard drag exists, so there is nothing to instruct.
const SCREEN_READER_INSTRUCTIONS = { draggable: '' };

/**
 * Chips that wrap across lines and drag into a new order. The mouse and touch
 * sensors swallow the click that ends a drag, so a drop never removes the chip.
 */
function ReorderableChips({ keys, labelFor, onMove, children }: ReorderableChipsProps) {
  const sensors = useSensors(
    // The distance leaves a click without movement to remove the chip.
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // The hold leaves a swipe that starts on a chip to scroll the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // Read when dnd-kit announces, so the announcements keep one identity.
  const current = useRef({ keys, labelFor });
  current.current = { keys, labelFor };

  const announcements = useMemo<Announcements>(() => {
    const name = (id: UniqueIdentifier) => current.current.labelFor(String(id));
    const position = (id: UniqueIdentifier) =>
      `position ${current.current.keys.indexOf(String(id)) + 1} of ${current.current.keys.length}`;

    return {
      onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
      onDragOver: ({ active, over }) =>
        over && over.id !== active.id
          ? `${name(active.id)} moved to ${position(over.id)}.`
          : undefined,
      onDragEnd: ({ active, over }) =>
        over && over.id !== active.id
          ? `${name(active.id)} was dropped at ${position(over.id)}.`
          : `${name(active.id)} was dropped.`,
      onDragCancel: ({ active }) => `Moving ${name(active.id)} was cancelled.`,
    };
  }, []);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }
    const from = keys.indexOf(String(active.id));
    const to = keys.indexOf(String(over.id));

    if (from !== -1 && to !== -1) {
      onMove(from, to);
    }
  };

  return (
    <DndContext
      accessibility={{ announcements, screenReaderInstructions: SCREEN_READER_INSTRUCTIONS }}
      collisionDetection={closestCenter}
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={keys} strategy={rectSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}
