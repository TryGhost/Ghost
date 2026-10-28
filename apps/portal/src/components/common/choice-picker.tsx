import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../utils/i18n';

// A pause this long ends a run of typed letters, as it does in a native select.
const TYPEAHEAD_RESET_MS = 500;

// Portal's phone breakpoint, where its popup fills the screen. The list opens as a sheet
// from the bottom here, rather than under the field.
const SHEET_QUERY = '(max-width: 480px)';

// The rows the dropdown shows before it scrolls. A longer list, like the countries, gets a
// search box above it, since finding one option among many by scrolling is slow.
const LIST_ROWS = 12;

// Those rows at 34px and the list's padding, and never more than there is space for on the
// side the list opens to.
const MAX_LIST_HEIGHT = LIST_ROWS * 34 + 8;

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23aeaeae' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

export const ChoicePickerStyles = `
    .gh-portal-choice-picker {
        position: relative;
    }

    /* The field is a .gh-portal-input, so it takes Portal's border, spacing and place in an
       input group like any other. This only makes room for the chips and the button. */
    .gh-portal-choice-picker .gh-portal-choice-field {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        padding: 6px;
        cursor: pointer;
    }

    /* Chips wrap onto more lines, so a field of several answers grows from the height an
       input has at this width (frame.styles sets 42px up to 1440px wide, 44px beyond). */
    .gh-portal-choice-picker .gh-portal-choice-field.is-multiple {
        height: auto;
        min-height: 44px;
    }

    @media (max-width: 1440px) {
        .gh-portal-choice-picker .gh-portal-choice-field.is-multiple {
            min-height: 42px;
        }
    }

    /* Focus shows on the field's border, as it does on .gh-portal-input, rather than as a
       ring around the button inside it. */
    .gh-portal-choice-picker.is-open .gh-portal-choice-field,
    .gh-portal-choice-field:focus-within {
        border-color: var(--grey8);
    }

    .gh-portal-choice-trigger:focus-visible {
        outline: none;
    }

    /* Lifted like a focused input in a group, so its border shows whole over its neighbours'. */
    .gh-portal-input-group .gh-portal-choice-picker.is-open .gh-portal-choice-field,
    .gh-portal-input-group .gh-portal-choice-field:focus-within {
        z-index: 1;
    }

    .gh-portal-choice-chip {
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

    .gh-portal-choice-chip-remove {
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

    .gh-portal-choice-chip-remove:hover {
        background: var(--grey11);
    }

    .gh-portal-choice-trigger {
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

    .gh-portal-choice-trigger.has-value {
        color: inherit;
    }

    /* One answer stays on one line, cut short like a native select's, so the field keeps
       the height of the inputs beside it. The list shows it whole. */
    .gh-portal-choice-field:not(.is-multiple) {
        flex-wrap: nowrap;
    }

    .gh-portal-choice-value {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* Once chips are picked they and the arrow say the field takes more, so the
       placeholder goes and the button shrinks to the arrow. */
    .gh-portal-choice-trigger.is-filled {
        flex-basis: 32px;
        min-width: 32px;
        justify-content: flex-end;
    }

    .gh-portal-choice-chevron {
        flex: none;
        width: 16px;
        height: 16px;
        background-image: ${CHEVRON};
        transition: transform 0.15s ease;
    }

    .gh-portal-choice-picker.is-open .gh-portal-choice-chevron {
        transform: rotate(180deg);
    }

    .gh-portal-choice-popover {
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

    .gh-portal-choice-popover.is-up {
        top: auto;
        bottom: calc(100% + 6px);
    }

    .gh-portal-choice-search {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        border-bottom: 1px solid var(--grey12);
        color: var(--grey8);
    }

    .gh-portal-choice-search input {
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

    /* A search that finds nothing shows an icon rather than a sentence, so the picker adds
       no wording for translators to keep up with. */
    .gh-portal-choice-empty {
        display: flex;
        justify-content: center;
        padding: 14px;
        color: var(--grey8);
    }

    .gh-portal-choice-list {
        max-height: ${MAX_LIST_HEIGHT}px;
        margin: 0;
        padding: 4px;
        overflow-y: auto;
        outline: none;
        list-style: none;
    }

    /* Whole pixels throughout: a row of 7px, a 20px line and 7px is 34px exactly, so every
       row starts on the pixel grid and each checkbox's tick renders the same way. A line
       height of 1.3 made rows 35.5px, and the tick sat differently on every other row. */
    .gh-portal-choice-option {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 34px;
        margin: 0;
        padding: 7px 10px;
        border-radius: 6px;
        font-size: 1.5rem;
        line-height: 20px;
        cursor: pointer;
    }

    .gh-portal-choice-option.is-active {
        background: var(--grey13);
    }

    /* A box for several answers, a circle for one: the same cue checkboxes and radios give. */
    .gh-portal-choice-marker {
        position: relative;
        flex: none;
        width: 14px;
        height: 14px;
        border: 1.5px solid var(--grey9);
        border-radius: 4px;
    }

    .gh-portal-choice-marker.is-round {
        border-radius: 50%;
    }

    .gh-portal-choice-option[aria-selected="true"] .gh-portal-choice-marker {
        border-color: var(--brandcolor);
        background: var(--brandcolor);
    }

    .gh-portal-choice-option[aria-selected="true"] .gh-portal-choice-marker::after {
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

    .gh-portal-choice-option[aria-selected="true"] .gh-portal-choice-marker.is-round::after {
        top: 3px;
        left: 3px;
        width: 5px;
        height: 5px;
        border: 0;
        border-radius: 50%;
        background: var(--white);
        transform: none;
    }

    /* On a phone the list rises from the bottom of the screen, apart from the field, with
       rows sized for a finger. */
    .gh-portal-choice-backdrop {
        position: fixed;
        inset: 0;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.3);
        touch-action: none;
        animation: gh-portal-choice-fade 0.2s ease-out;
    }

    .gh-portal-choice-sheet {
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
        animation: gh-portal-choice-rise 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    /* The top of the sheet, handle and title, is what drags it down to close. The list
       below keeps its own scrolling. */
    .gh-portal-choice-sheet-header {
        position: relative;
        flex: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 12px 4px 22px;
        touch-action: none;
        user-select: none;
    }

    .gh-portal-choice-sheet-header::before {
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

    .gh-portal-choice-sheet-title {
        color: var(--grey0);
        font-size: 1.6rem;
        font-weight: 600;
    }

    .gh-portal-choice-sheet-close {
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

    .gh-portal-choice-sheet .gh-portal-choice-search {
        flex: none;
        margin: 4px 12px 0;
        border: 1px solid var(--grey11);
        border-radius: 8px;
    }

    .gh-portal-choice-sheet .gh-portal-choice-list {
        flex: 1;
        min-height: 0;
        max-height: none;
        padding: 4px 8px 12px;
        overscroll-behavior: contain;
    }

    .gh-portal-choice-sheet .gh-portal-choice-option {
        min-height: 44px;
        font-size: 1.6rem;
    }

    @keyframes gh-portal-choice-fade {
        from { opacity: 0; }
    }

    @keyframes gh-portal-choice-rise {
        from { transform: translateY(100%); }
    }

    @media (prefers-reduced-motion: reduce) {
        .gh-portal-choice-backdrop,
        .gh-portal-choice-sheet {
            transition: none;
            animation: none;
        }
    }
`;

/** The cross on a chip and on the sheet's close button. */
function Cross({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

// Portal closes itself when Escape is released, so the release of an Escape that closed the
// list is stopped before it reaches the document; a second Escape closes Portal as usual.
const keepEscapeFromPortal = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.stopPropagation();
  }
};

/** An option as stored and as shown: a list's are the same text, a country's a code and its name. */
export interface ChoiceOption {
  value: string;
  label: string;
}

interface ChoicePickerProps {
  id: string;
  /** The label the field and its list are named by, shown or not. */
  labelId: string;
  /** The field's name, the sheet's title on a phone. */
  label: string;
  options: ChoiceOption[];
  /** The values picked. */
  value: string[];
  /** Several answers, shown as chips. Otherwise one, shown as text, and picking closes the list. */
  multiple: boolean;
  placeholder: string;
  invalid?: boolean;
  /** What says why the field was refused, when that is printed elsewhere. */
  describedBy?: string;
  onChange: (value: string[]) => void;
}

/** The first option from `from` on, wrapping round, whose label starts with what was typed. */
function startingWith(choices: ChoiceOption[], typed: string, from: number): number {
  for (let step = 0; step < choices.length; step += 1) {
    const index = (from + step) % choices.length;
    if (choices[index]?.label.toLowerCase().startsWith(typed)) {
      return index;
    }
  }
  return -1;
}

/**
 * Options picked from a list that opens below the field, or as a sheet from the bottom of a
 * phone's screen that drags down to close: one, or several shown as chips.
 * Portal can't use Admin's pickers, so this follows how they behave: ↑ ↓ Home and End move,
 * Enter or Space picks, Escape and Tab close, and typing jumps to the option that starts
 * with what was typed, the way a native select does. Past 12 options a search box sits
 * above the list, named after the field. On a touch screen it waits to be tapped, so a
 * phone doesn't raise its keyboard over the options.
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
  describedBy,
  onChange,
}: ChoicePickerProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [up, setUp] = useState(false);
  const [listHeight, setListHeight] = useState(MAX_LIST_HEIGHT);
  const [sheet, setSheet] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const typed = useRef({ letters: '', at: 0 });
  const drag = useRef<{ from: number; at: number; by: number } | null>(null);

  // A value saved before its option was renamed or removed is still listed, as chosen, so
  // it can be unpicked like any other.
  const choices = [
    ...options,
    ...value
      .filter((picked) => !options.some((option) => option.value === picked))
      .map((picked) => ({ value: picked, label: picked })),
  ];
  const labelOf = (picked: string) =>
    choices.find((choice) => choice.value === picked)?.label ?? picked;
  const searchable = choices.length > LIST_ROWS;
  const term = query.trim().toLowerCase();
  // What the list shows: every option, or those whose label holds what was searched for.
  const shown = term
    ? choices.filter((choice) => choice.label.toLowerCase().includes(term))
    : choices;
  const optionId = (index: number) => `${id}-option-${index}`;

  const openList = () => {
    setSheet(Boolean(rootRef.current?.ownerDocument.defaultView?.matchMedia(SHEET_QUERY).matches));
    setQuery('');
    setActive(
      Math.max(
        0,
        choices.findIndex((choice) => value.includes(choice.value)),
      ),
    );
    setOpen(true);
  };

  const closeList = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  };

  const pick = (choice: string) => {
    if (multiple) {
      // Kept in the order the options are offered, whatever order they were picked in.
      onChange(
        value.includes(choice)
          ? value.filter((picked) => picked !== choice)
          : choices
              .map((option) => option.value)
              .filter((option) => option === choice || value.includes(option)),
      );
      return;
    }
    // Picking the one answer again clears it. Either way the list has done its job.
    onChange(value.length === 1 && value[0] === choice ? [] : [choice]);
    closeList(true);
  };

  const isTyping = () => Date.now() - typed.current.at < TYPEAHEAD_RESET_MS;

  // A fresh letter moves on from the highlighted option, so pressing it again steps
  // through everything starting with it; more letters narrow the match where it stands.
  const jumpTo = (letter: string) => {
    const letters = (isTyping() ? typed.current.letters : '') + letter.toLowerCase();
    typed.current = { letters, at: Date.now() };
    const match = startingWith(shown, letters, letters.length === 1 ? active + 1 : active);
    if (match !== -1) {
      setActive(match);
    }
  };

  // Hands the keyboard to the list, and opens a dropdown upward when there isn't room below.
  useLayoutEffect(() => {
    if (!open || !rootRef.current || !popoverRef.current) {
      return;
    }
    const view = rootRef.current.ownerDocument.defaultView;
    // A search box would raise a phone's keyboard over the options, so there it waits to be
    // tapped and the list takes the keys.
    if (searchable && !view?.matchMedia('(pointer: coarse)').matches) {
      searchRef.current?.focus();
    } else {
      listRef.current?.focus();
    }
    if (!sheet && listRef.current) {
      const field = rootRef.current.getBoundingClientRect();
      const below = (view?.innerHeight ?? 0) - field.bottom - 12;
      const above = field.top - 12;
      // The search box, if any, sits above the list and takes its share of the room.
      const chrome = popoverRef.current.offsetHeight - listRef.current.offsetHeight;
      const wanted = Math.min(MAX_LIST_HEIGHT, listRef.current.scrollHeight) + chrome;
      const opensUp = below < wanted && above > below;
      setUp(opensUp);
      setListHeight(Math.min(MAX_LIST_HEIGHT, (opensUp ? above : below) - chrome));
    }
  }, [open, sheet]);

  useEffect(() => {
    if (open) {
      listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, active]);

  // A press anywhere outside closes the dropdown. The sheet's backdrop closes the sheet on
  // its own click instead, so the tap can't carry through to whatever lies beneath.
  useEffect(() => {
    const doc = rootRef.current?.ownerDocument;
    if (!open || sheet || !doc) {
      return;
    }
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    doc.addEventListener('pointerdown', closeOutside);
    return () => doc.removeEventListener('pointerdown', closeOutside);
  }, [open, sheet]);

  const handleListKeys = (event: React.KeyboardEvent<HTMLElement>) => {
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
    } else if (event.key === 'Enter' || (event.key === ' ' && !inSearch && !isTyping())) {
      event.preventDefault();
      const choice = shown[active];
      if (choice !== undefined) {
        pick(choice.value);
      }
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (event.key === 'Backspace' && inSearch && !query && multiple && value.length) {
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

  const doc = rootRef.current?.ownerDocument;

  // The sheet follows a finger dragging its top downward. Let go past a quarter of its
  // height, or with a flick, and it slides away and closes; otherwise it settles back.
  const dragSheet = {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      // The close button takes its own taps.
      if ((event.target as Element).closest('button')) {
        return;
      }
      drag.current = { from: event.clientY, at: event.timeStamp, by: 0 };
      event.currentTarget.setPointerCapture(event.pointerId);
      popoverRef.current?.style.setProperty('transition', 'none');
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drag.current || !popoverRef.current) {
        return;
      }
      drag.current.by = Math.max(0, event.clientY - drag.current.from);
      popoverRef.current.style.transform = `translateY(${drag.current.by}px)`;
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => {
      const sheetElement = popoverRef.current;
      const released = drag.current;
      drag.current = null;
      if (!released || !sheetElement) {
        return;
      }
      sheetElement.style.removeProperty('transition');
      const flicked = released.by / Math.max(1, event.timeStamp - released.at) > 0.5;
      if (released.by > sheetElement.offsetHeight / 4 || flicked) {
        sheetElement.style.transform = 'translateY(100%)';
        window.setTimeout(() => closeList(true), 200);
      } else {
        sheetElement.style.transform = '';
      }
    },
  };

  const list = (
    <ul
      ref={listRef}
      aria-activedescendant={shown.length ? optionId(active) : undefined}
      aria-labelledby={labelId}
      aria-multiselectable={multiple || undefined}
      className="gh-portal-choice-list"
      id={`${id}-list`}
      role="listbox"
      style={sheet ? undefined : { maxHeight: listHeight }}
      tabIndex={-1}
      onKeyDown={handleListKeys}
    >
      {shown.map(({ value: choice, label: optionLabel }, index) => (
        // Picked from the keyboard through the listbox's active option, so a row only
        // answers the pointer.
        <li
          key={choice}
          aria-selected={value.includes(choice)}
          className={`gh-portal-choice-option${index === active ? ' is-active' : ''}`}
          data-active={index === active || undefined}
          id={optionId(index)}
          role="option"
          onClick={() => pick(choice)}
          // Keeps focus in the list, so it stays open while picking several.
          onMouseDown={(event) => event.preventDefault()}
          onMouseMove={() => setActive(index)}
        >
          <span
            aria-hidden="true"
            className={`gh-portal-choice-marker${multiple ? '' : ' is-round'}`}
          />
          <span>{optionLabel}</span>
        </li>
      ))}
    </ul>
  );

  // Named and labelled with the field it searches, such as "Country", so it needs no
  // wording of its own.
  const search = searchable && (
    <div className="gh-portal-choice-search">
      <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3.5-3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      </svg>
      <input
        ref={searchRef}
        aria-activedescendant={shown.length ? optionId(active) : undefined}
        aria-autocomplete="list"
        aria-controls={`${id}-list`}
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
        onKeyDown={handleListKeys}
      />
    </div>
  );

  const nothingFound = searchable && shown.length === 0 && (
    <div aria-hidden="true" className="gh-portal-choice-empty">
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
  if (multiple && value.length) {
    fieldText = '';
  } else if (value.length) {
    // A field that took several answers before it was changed to take one keeps them
    // until the member picks again.
    fieldText = value.map(labelOf).join(', ');
  }

  const triggerClasses = [
    'gh-portal-choice-trigger',
    !multiple && value.length ? 'has-value' : '',
    multiple && value.length ? 'is-filled' : '',
  ];

  return (
    <div
      ref={rootRef}
      className={`gh-portal-choice-picker${open ? ' is-open' : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          rootRef.current?.ownerDocument.addEventListener('keyup', keepEscapeFromPortal, {
            capture: true,
            once: true,
          });
          closeList(true);
        }
      }}
    >
      {/* A click on the field's empty space opens the list too, as the button inside does
          for the keyboard. */}
      <div
        className={`gh-portal-input gh-portal-choice-field${multiple ? ' is-multiple' : ''}${invalid ? ' error' : ''}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            if (open) {
              closeList();
            } else {
              openList();
            }
          }
        }}
      >
        {multiple &&
          value.map((answer) => (
            <span key={answer} className="gh-portal-choice-chip">
              <span>{labelOf(answer)}</span>
              <button
                aria-label={t('Remove {option}', { option: labelOf(answer) })}
                className="gh-portal-choice-chip-remove"
                type="button"
                onClick={() => {
                  onChange(value.filter((picked) => picked !== answer));
                  triggerRef.current?.focus();
                }}
              >
                <Cross size={12} />
              </button>
            </span>
          ))}
        <button
          ref={triggerRef}
          aria-controls={`${id}-list`}
          aria-describedby={describedBy}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-labelledby={`${labelId} ${id}`}
          className={triggerClasses.filter(Boolean).join(' ')}
          id={id}
          type="button"
          onClick={() => (open ? closeList() : openList())}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              openList();
            }
          }}
        >
          <span className="gh-portal-choice-value">{fieldText}</span>
          <span aria-hidden="true" className="gh-portal-choice-chevron" />
        </button>
      </div>
      {open && !sheet && (
        <div ref={popoverRef} className={`gh-portal-choice-popover${up ? ' is-up' : ''}`}>
          {search}
          {list}
          {nothingFound}
        </div>
      )}
      {/* Rendered into the page's body: Portal's popup is transformed, which would hold a
          fixed sheet inside it rather than against the screen. */}
      {open &&
        sheet &&
        doc &&
        createPortal(
          <>
            <div
              aria-hidden="true"
              className="gh-portal-choice-backdrop"
              onClick={() => closeList(true)}
            />
            <div
              ref={popoverRef}
              aria-label={label}
              aria-modal="true"
              className="gh-portal-choice-sheet"
              role="dialog"
            >
              <div
                className="gh-portal-choice-sheet-header"
                {...dragSheet}
                onPointerCancel={dragSheet.onPointerUp}
              >
                <span aria-hidden="true" className="gh-portal-choice-sheet-title">
                  {label}
                </span>
                <button
                  aria-label={t('Close')}
                  className="gh-portal-choice-sheet-close"
                  type="button"
                  onClick={() => closeList(true)}
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
