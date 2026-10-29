import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../utils/i18n';

// Portal's phone breakpoint, where its popup fills the screen. The list rises from the bottom of
// the screen here, rather than opening under the field.
const PHONE_QUERY = '(max-width: 480px)';

// The rows the list shows before it scrolls, each ROW_HEIGHT tall. A longer list gets a search
// box above it, since finding one option among many by scrolling is slow.
const VISIBLE_ROWS = 12;
const ROW_HEIGHT = 34;
const MAX_LIST_HEIGHT = VISIBLE_ROWS * ROW_HEIGHT + 8;

// The room the list keeps from the top and bottom of the screen.
const SCREEN_MARGIN = 12;

// A pause this long ends a run of typed letters, as it does in a native select.
const TYPEAHEAD_PAUSE_MS = 500;

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23aeaeae' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

export const ChoicePickerStyles = `
    .gh-portal-picker {
        position: relative;
    }

    /* The field is a .gh-portal-input, so it takes Portal's border and spacing like any other
       input. This only makes room for the chips and the button inside it. */
    .gh-portal-picker .gh-portal-picker-field {
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: 6px;
        padding: 6px;
        cursor: pointer;
    }

    /* Chips wrap onto more lines, so a field of several answers grows from an input's height
       (frame.styles sets 42px up to 1440px wide, 44px beyond). */
    .gh-portal-picker .gh-portal-picker-field.is-multiple {
        flex-wrap: wrap;
        height: auto;
        min-height: 44px;
    }

    @media (max-width: 1440px) {
        .gh-portal-picker .gh-portal-picker-field.is-multiple {
            min-height: 42px;
        }
    }

    /* Focus shows on the field's border, as it does on an input, not as a ring around the
       button inside it. */
    .gh-portal-picker.is-open .gh-portal-picker-field,
    .gh-portal-picker-field:focus-within {
        border-color: var(--grey8);
    }

    .gh-portal-picker-trigger:focus-visible {
        outline: none;
    }

    .gh-portal-picker-chip {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        max-width: 100%;
        padding: 2px 2px 2px 8px;
        border-radius: 4px;
        background: var(--grey12);
        color: var(--grey1);
        font-size: 1.4rem;
        line-height: 1.4;
        cursor: default;
    }

    .gh-portal-picker-chip-remove {
        display: grid;
        flex: none;
        place-items: center;
        width: 20px;
        height: 20px;
        padding: 0;
        border: 0;
        border-radius: 3px;
        background: none;
        color: inherit;
        cursor: pointer;
    }

    .gh-portal-picker-chip-remove:hover {
        background: var(--grey11);
    }

    .gh-portal-picker-trigger {
        display: flex;
        flex: 1 1 96px;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-width: 96px;
        min-height: 28px;
        padding: 0 4px 0 6px;
        border: 0;
        background: none;
        color: var(--grey8);
        font: inherit;
        text-align: start;
        cursor: pointer;
    }

    .gh-portal-picker-trigger.has-value {
        color: inherit;
    }

    /* Once chips are picked, they and the arrow say the field takes more, so the placeholder
       goes and the button shrinks to the arrow. */
    .gh-portal-picker-trigger.is-filled {
        flex-basis: 32px;
        min-width: 32px;
        justify-content: flex-end;
    }

    /* One answer stays on one line, cut short like a native select's, so the field keeps the
       height of the inputs around it. The list shows it whole. */
    .gh-portal-picker-value {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .gh-portal-picker-chevron {
        flex: none;
        width: 16px;
        height: 16px;
        background-image: ${CHEVRON};
        transition: transform 0.15s ease;
    }

    .gh-portal-picker.is-open .gh-portal-picker-chevron {
        transform: rotate(180deg);
    }

    .gh-portal-picker-popover {
        position: absolute;
        top: calc(100% + 6px);
        right: 0;
        left: 0;
        z-index: 5;
        overflow: hidden;
        border: 1px solid var(--grey11);
        border-radius: 8px;
        background: var(--white);
        box-shadow: 0 14px 30px -10px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.06);
    }

    .gh-portal-picker-popover.is-up {
        top: auto;
        bottom: calc(100% + 6px);
    }

    .gh-portal-picker-search {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        border-bottom: 1px solid var(--grey12);
        color: var(--grey8);
    }

    .gh-portal-picker-search input {
        flex: 1;
        min-width: 0;
        height: 40px;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--grey1);
        font: inherit;
        font-size: 1.5rem;
    }

    /* A search that finds nothing shows an icon rather than a sentence, so there is no wording
       to translate. */
    .gh-portal-picker-empty {
        display: flex;
        justify-content: center;
        padding: 14px;
        color: var(--grey8);
    }

    .gh-portal-picker-list {
        max-height: ${MAX_LIST_HEIGHT}px;
        margin: 0;
        padding: 4px;
        overflow-y: auto;
        outline: none;
        list-style: none;
    }

    /* Whole pixels: 7px, a 20px line and 7px make a row exactly ${ROW_HEIGHT}px, so every row
       starts on the pixel grid and every tick is drawn the same. */
    .gh-portal-picker-option {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: ${ROW_HEIGHT}px;
        margin: 0;
        padding: 7px 10px;
        border-radius: 6px;
        font-size: 1.5rem;
        line-height: 20px;
        cursor: pointer;
    }

    .gh-portal-picker-option.is-active {
        background: var(--grey13);
    }

    /* A box for several answers and a circle for one, the cue checkboxes and radios give. */
    .gh-portal-picker-marker {
        position: relative;
        flex: none;
        width: 14px;
        height: 14px;
        border: 1.5px solid var(--grey9);
        border-radius: 4px;
    }

    .gh-portal-picker-marker.is-round {
        border-radius: 50%;
    }

    /* Keeps the row's text in line with the options' without a marker of its own. */
    .gh-portal-picker-marker.is-none {
        visibility: hidden;
    }

    .gh-portal-picker-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .gh-portal-picker-chip.is-read-only {
        padding-right: 8px;
    }

    .gh-portal-picker-option[aria-selected="true"] .gh-portal-picker-marker {
        border-color: var(--brandcolor);
        background: var(--brandcolor);
    }

    .gh-portal-picker-option[aria-selected="true"] .gh-portal-picker-marker::after {
        content: "";
        position: absolute;
        top: 0.5px;
        left: 3.5px;
        width: 3.5px;
        height: 7px;
        border-right: 1.5px solid var(--white);
        border-bottom: 1.5px solid var(--white);
        transform: rotate(45deg);
    }

    .gh-portal-picker-option[aria-selected="true"] .gh-portal-picker-marker.is-round::after {
        top: 3px;
        left: 3px;
        width: 5px;
        height: 5px;
        border: 0;
        border-radius: 50%;
        background: var(--white);
        transform: none;
    }

    /* On a phone the list rises from the bottom of the screen, with rows sized for a finger. */
    .gh-portal-picker-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.3);
        touch-action: none;
        animation: gh-portal-picker-fade 0.2s ease-out;
    }

    .gh-portal-picker-sheet {
        position: fixed;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 10001;
        display: flex;
        flex-direction: column;
        max-height: 70vh;
        max-height: 70dvh;
        padding-bottom: env(safe-area-inset-bottom);
        border-radius: 16px 16px 0 0;
        background: var(--white);
        box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.12);
        transition: transform 0.2s ease-out;
        animation: gh-portal-picker-rise 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    /* The sheet's top, its handle and title, drags it down to close. The list below keeps its
       own scrolling. */
    .gh-portal-picker-sheet-header {
        position: relative;
        flex: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 12px 4px 22px;
        touch-action: none;
        user-select: none;
    }

    .gh-portal-picker-sheet-header::before {
        content: "";
        position: absolute;
        top: 8px;
        left: 50%;
        width: 36px;
        height: 4px;
        margin-left: -18px;
        border-radius: 2px;
        background: var(--grey10);
    }

    .gh-portal-picker-sheet-title {
        color: var(--grey0);
        font-size: 1.6rem;
        font-weight: 600;
    }

    .gh-portal-picker-sheet-close {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: var(--grey13);
        color: var(--grey5);
        cursor: pointer;
    }

    .gh-portal-picker-sheet .gh-portal-picker-search {
        flex: none;
        margin: 4px 12px 0;
        border: 1px solid var(--grey11);
        border-radius: 8px;
    }

    .gh-portal-picker-sheet .gh-portal-picker-list {
        flex: 1;
        min-height: 0;
        max-height: none;
        padding: 4px 8px 12px;
        overscroll-behavior: contain;
    }

    .gh-portal-picker-sheet .gh-portal-picker-option {
        min-height: 44px;
        font-size: 1.6rem;
    }

    @keyframes gh-portal-picker-fade {
        from { opacity: 0; }
    }

    @keyframes gh-portal-picker-rise {
        from { transform: translateY(100%); }
    }

    @media (prefers-reduced-motion: reduce) {
        .gh-portal-picker-backdrop,
        .gh-portal-picker-sheet {
            transition: none;
            animation: none;
        }
    }
`;

const classes = (...names: Array<string | false>) => names.filter(Boolean).join(' ');

/** The cross on a chip and on the sheet's close button. */
function Cross({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

// Portal closes itself when Escape is released, so the release of an Escape that closed the list
// is stopped before it gets there. A second Escape closes Portal as usual.
const holdEscapeRelease = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.stopPropagation();
  }
};

/** A row of the list: an option, or for one answer the row that clears it. */
interface Row {
  option: string | null;
  label: string;
}

/** The first label from `from` on, wrapping round, that starts with what was typed. */
function startingWith(options: readonly string[], typed: string, from: number): number {
  for (let step = 0; step < options.length; step += 1) {
    const index = (from + step) % options.length;
    if (options[index]?.toLowerCase().startsWith(typed)) {
      return index;
    }
  }
  return -1;
}

interface ChoicePickerProps {
  id: string;
  /** The label the field and its list are named by. */
  labelId: string;
  /** The field's name: the sheet's title, and what the search box says it searches. */
  label: string;
  options: readonly string[];
  /** The options picked, in the order the field offers them. */
  value: readonly string[];
  /** Several answers, shown as chips. Otherwise one, shown as text, and picking closes the list. */
  multiple: boolean;
  placeholder: string;
  invalid?: boolean;
  disabled?: boolean;
  /** Shows the answers as chips, with nothing to pick from, for a field the member may only read. */
  readOnly?: boolean;
  /** What says why the field was refused, when it was. */
  describedBy?: string | undefined;
  onChange: (picked: string[]) => void;
}

/**
 * Options picked from a list that opens under the field, or on a phone rises from the bottom of
 * the screen and drags down to close: one, or several shown as chips.
 *
 * Portal can't use Admin's pickers, so this behaves as they do: ↑ ↓ Home and End move, Enter or
 * Space picks, Escape and Tab close, and typing jumps to the option that starts with what was
 * typed, as a native select does. Past twelve options a search box sits above the list, named
 * after the field. On a touch screen it waits to be tapped, so the keyboard doesn't rise over the
 * options.
 */
export default function ChoicePicker({
  id,
  labelId,
  label,
  options,
  value,
  multiple,
  placeholder,
  invalid,
  disabled,
  readOnly,
  describedBy,
  onChange,
}: ChoicePickerProps) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState('');
  const [placement, setPlacement] = useState({ up: false, height: MAX_LIST_HEIGHT });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typed = useRef({ letters: '', at: 0 });
  const drag = useRef<{ from: number; at: number; by: number } | null>(null);

  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const searchable = options.length > VISIBLE_ROWS;
  const term = query.trim().toLowerCase();
  // One answer is cleared the way a native select's is: once something is chosen, a first row
  // stands for no answer, named as Portal's selects name it. A search is for an option, so it
  // leaves that row out.
  const rowsFor = (searched: string): Row[] => [
    ...(!multiple && value.length > 0 && !searched ? [{ option: null, label: t('(None)') }] : []),
    ...options
      .filter((option) => !searched || option.toLowerCase().includes(searched))
      .map((option) => ({ option, label: option })),
  ];
  const shown = rowsFor(term);
  const view = () => rootRef.current?.ownerDocument.defaultView;

  const openList = () => {
    if (disabled) {
      return;
    }
    setSheet(Boolean(view()?.matchMedia(PHONE_QUERY).matches));
    setQuery('');
    // Read from the rows the list opens with, which a search left from last time doesn't filter.
    setActive(
      Math.max(
        0,
        rowsFor('').findIndex(({ option }) => option !== null && value.includes(option)),
      ),
    );
    setOpen(true);
  };

  // The keyboard goes to the search box, if there is one, or to the list. A search box would raise
  // a phone's keyboard over the options, so on a touch screen it waits to be tapped.
  const focusInside = () => {
    if (searchable && !view()?.matchMedia('(pointer: coarse)').matches) {
      searchRef.current?.focus();
    } else {
      listRef.current?.focus();
    }
  };

  // Back inside the list while it is open; otherwise to the field.
  const refocus = () => {
    if (open) {
      focusInside();
    } else {
      triggerRef.current?.focus();
    }
  };

  const closeList = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  };

  const pick = (option: string | null) => {
    if (option === null) {
      onChange([]);
      closeList(true);
      return;
    }
    if (multiple) {
      onChange(
        options.filter((candidate) =>
          candidate === option ? !value.includes(option) : value.includes(candidate),
        ),
      );
      return;
    }
    onChange([option]);
    closeList(true);
  };

  const stillTyping = () => Date.now() - typed.current.at < TYPEAHEAD_PAUSE_MS;

  // A fresh letter moves on from the highlighted option, so pressing it again steps through
  // everything starting with it; more letters narrow the match where it stands.
  const jumpTo = (letter: string) => {
    const letters = (stillTyping() ? typed.current.letters : '') + letter.toLowerCase();
    typed.current = { letters, at: Date.now() };
    const match = startingWith(
      shown.map(({ label: text }) => text),
      letters,
      letters.length === 1 ? active + 1 : active,
    );
    if (match !== -1) {
      setActive(match);
    }
  };

  // Hands the keyboard to the list, and opens it upward when there isn't room below.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const panel = panelRef.current;
    const list = listRef.current;
    if (!open || !root || !panel || !list) {
      return;
    }
    focusInside();
    if (sheet) {
      return;
    }
    const field = root.getBoundingClientRect();
    const below = (view()?.innerHeight ?? 0) - field.bottom - SCREEN_MARGIN;
    const above = field.top - SCREEN_MARGIN;
    // The search box, if there is one, takes its share of the room.
    const chrome = panel.offsetHeight - list.offsetHeight;
    const wanted = Math.min(MAX_LIST_HEIGHT, list.scrollHeight) + chrome;
    const up = below < wanted && above > below;
    setPlacement({ up, height: Math.min(MAX_LIST_HEIGHT, (up ? above : below) - chrome) });
  }, [open, sheet]);

  useEffect(() => {
    if (open) {
      listRef.current?.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, active]);

  // A press anywhere outside closes the dropdown. The sheet's backdrop closes the sheet on its own
  // tap instead, so the tap can't carry through to whatever lies beneath it.
  useEffect(() => {
    const doc = rootRef.current?.ownerDocument;
    if (!open || sheet || !doc) {
      return;
    }
    // Portal draws in an iframe, so what was pressed is a node of the iframe's own window, which
    // the page's Node doesn't recognise.
    const FrameNode = doc.defaultView?.Node;
    const closeOutside = (event: PointerEvent) => {
      if (
        FrameNode &&
        event.target instanceof FrameNode &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    doc.addEventListener('pointerdown', closeOutside);
    return () => doc.removeEventListener('pointerdown', closeOutside);
  }, [open, sheet]);

  const onListKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const inSearch = event.currentTarget === searchRef.current;
    const last = shown.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(last, active + 1),
      ArrowUp: Math.max(0, active - 1),
      Home: 0,
      End: last,
    };
    const move = moves[event.key];
    if (move !== undefined) {
      event.preventDefault();
      setActive(move);
    } else if (event.key === 'Enter' || (event.key === ' ' && !inSearch && !stillTyping())) {
      event.preventDefault();
      const row = shown[active];
      if (row !== undefined) {
        pick(row.option);
      }
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (event.key === 'Backspace' && inSearch && !query && multiple && value.length > 0) {
      // An empty search box steps back into the chips, as a tag field does.
      onChange(value.slice(0, -1));
    } else if (
      !inSearch &&
      event.key.length === 1 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      jumpTo(event.key);
    }
  };

  // The sheet follows a finger dragging its top down. Let go past a quarter of its height, or
  // with a flick, and it slides away and closes; otherwise it settles back.
  const dragSheet = {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      drag.current = { from: event.clientY, at: event.timeStamp, by: 0 };
      event.currentTarget.setPointerCapture(event.pointerId);
      panelRef.current?.style.setProperty('transition', 'none');
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drag.current || !panelRef.current) {
        return;
      }
      drag.current.by = Math.max(0, event.clientY - drag.current.from);
      panelRef.current.style.transform = `translateY(${drag.current.by}px)`;
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
      const panel = panelRef.current;
      const released = drag.current;
      drag.current = null;
      if (!released || !panel) {
        return;
      }
      panel.style.removeProperty('transition');
      const flicked = released.by / Math.max(1, event.timeStamp - released.at) > 0.5;
      if (released.by > panel.offsetHeight / 4 || flicked) {
        panel.style.transform = 'translateY(100%)';
        view()?.setTimeout(() => closeList(true), 200);
      } else {
        panel.style.transform = '';
      }
    },
  };

  const list = (
    <ul
      ref={listRef}
      aria-activedescendant={shown.length > 0 ? optionId(active) : undefined}
      aria-labelledby={labelId}
      aria-multiselectable={multiple || undefined}
      className="gh-portal-picker-list"
      id={listId}
      role="listbox"
      style={sheet ? undefined : { maxHeight: placement.height }}
      tabIndex={-1}
      onKeyDown={onListKeyDown}
    >
      {shown.map(({ option, label: text }, index) => (
        // Picked from the keyboard through the listbox's active option, so a row only answers
        // the pointer.
        <li
          key={option ?? ''}
          aria-selected={option !== null && value.includes(option)}
          className={classes('gh-portal-picker-option', index === active && 'is-active')}
          data-active={index === active || undefined}
          id={optionId(index)}
          role="option"
          onClick={() => pick(option)}
          // Keeps focus in the list, so it stays open while several are picked.
          onMouseDown={(event) => event.preventDefault()}
          onMouseMove={() => setActive(index)}
        >
          <span
            aria-hidden="true"
            className={classes(
              'gh-portal-picker-marker',
              !multiple && 'is-round',
              option === null && 'is-none',
            )}
          />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );

  // Named and labelled by the field it searches, so it needs no wording of its own.
  const search = searchable && (
    <div className="gh-portal-picker-search">
      <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3.5-3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      </svg>
      <input
        ref={searchRef}
        aria-activedescendant={shown.length > 0 ? optionId(active) : undefined}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded="true"
        aria-labelledby={labelId}
        autoComplete="off"
        placeholder={label}
        role="combobox"
        spellCheck={false}
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onListKeyDown}
      />
    </div>
  );

  const nothingFound = searchable && shown.length === 0 && (
    <div aria-hidden="true" className="gh-portal-picker-empty">
      <svg fill="none" height="20" viewBox="0 0 24 24" width="20">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
        <path
          d="m21 21-4.3-4.3M13.5 8.5l-5 5M8.5 8.5l5 5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
    </div>
  );

  let fieldText = placeholder;
  if (multiple && value.length > 0) {
    fieldText = '';
  } else if (value.length > 0) {
    fieldText = value.join(', ');
  }

  const doc = rootRef.current?.ownerDocument;

  // Every answer as a chip, one or several, since an option's text can hold a comma.
  if (readOnly) {
    return (
      <div className="gh-portal-input gh-portal-picker-field is-multiple">
        {value.length > 0 && (
          <ul aria-labelledby={labelId} className="gh-portal-picker-chips" id={id}>
            {value.map((answer) => (
              <li key={answer} className="gh-portal-picker-chip is-read-only">
                {answer}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={classes('gh-portal-picker', open && 'is-open')}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          rootRef.current?.ownerDocument.addEventListener('keyup', holdEscapeRelease, {
            capture: true,
            once: true,
          });
          closeList(true);
        }
      }}
    >
      {/* A click on the field's empty space opens the list too, as the button inside it does
          for the keyboard. */}
      <div
        className={classes(
          'gh-portal-input',
          'gh-portal-picker-field',
          multiple && 'is-multiple',
          Boolean(invalid) && 'error',
        )}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            if (open) {
              closeList(false);
            } else {
              openList();
            }
          }
        }}
      >
        {multiple &&
          value.map((answer) => (
            <span key={answer} className="gh-portal-picker-chip">
              <span>{answer}</span>
              <button
                aria-label={t('Remove {option}', { option: answer })}
                className="gh-portal-picker-chip-remove"
                disabled={disabled}
                type="button"
                onClick={() => {
                  onChange(value.filter((picked) => picked !== answer));
                  refocus();
                }}
              >
                <Cross size={12} />
              </button>
            </span>
          ))}
        <button
          ref={triggerRef}
          aria-controls={listId}
          aria-describedby={describedBy}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-labelledby={`${labelId} ${id}`}
          className={classes(
            'gh-portal-picker-trigger',
            !multiple && value.length > 0 && 'has-value',
            multiple && value.length > 0 && 'is-filled',
          )}
          disabled={disabled}
          id={id}
          type="button"
          onClick={() => (open ? closeList(false) : openList())}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              openList();
            }
          }}
        >
          <span className="gh-portal-picker-value">{fieldText}</span>
          <span aria-hidden="true" className="gh-portal-picker-chevron" />
        </button>
      </div>
      {open && !sheet && (
        <div
          ref={panelRef}
          className={classes('gh-portal-picker-popover', placement.up && 'is-up')}
        >
          {search}
          {list}
          {nothingFound}
        </div>
      )}
      {/* Drawn into the page's body: Portal's popup is transformed, which would hold a fixed
          sheet inside it rather than against the screen. */}
      {open &&
        sheet &&
        doc &&
        createPortal(
          <>
            <div
              aria-hidden="true"
              className="gh-portal-picker-backdrop"
              onClick={() => closeList(true)}
            />
            <div
              ref={panelRef}
              aria-label={label}
              aria-modal="true"
              className="gh-portal-picker-sheet"
              role="dialog"
            >
              <div
                className="gh-portal-picker-sheet-header"
                onPointerCancel={dragSheet.onPointerUp}
                onPointerDown={dragSheet.onPointerDown}
                onPointerMove={dragSheet.onPointerMove}
                onPointerUp={dragSheet.onPointerUp}
              >
                <span aria-hidden="true" className="gh-portal-picker-sheet-title">
                  {label}
                </span>
                <button
                  aria-label={t('Close')}
                  className="gh-portal-picker-sheet-close"
                  type="button"
                  onClick={() => closeList(true)}
                  // The close button takes its own taps, rather than starting a drag of the sheet.
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <Cross size={16} />
                </button>
              </div>
              {search}
              {list}
              {nothingFound}
            </div>
          </>,
          doc.body,
        )}
    </div>
  );
}
