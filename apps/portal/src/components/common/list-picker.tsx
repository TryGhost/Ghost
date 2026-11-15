import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import BottomSheet from './bottom-sheet';
import CrossIcon from '../../images/icons/cross.svg?react';
import Popover from './popover';
import { t } from '../../utils/i18n';

/**
 * Portal treats a window narrower than this as a phone's, as popup-modal.jsx does. On a phone the
 * list opens in a bottom sheet.
 */
const PHONE_WIDTH = 480;

/**
 * The rows the list shows before it scrolls, each ROW_HEIGHT tall, inside the list's 4px padding
 * top and bottom. A list of more options than this gets a search box above it, since finding one
 * option among many by scrolling is slow.
 */
const VISIBLE_ROWS = 12;
const ROW_HEIGHT = 34;
const MAX_LIST_HEIGHT = VISIBLE_ROWS * ROW_HEIGHT + 8;

/** A pause this long ends a run of typed letters, as it does in a native select. */
const TYPEAHEAD_PAUSE_MS = 500;

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23aeaeae' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

export const ListPickerStyles = `
    /* The field is a .gh-portal-input, so it takes Portal's border and spacing like any other
       input. This only makes room for the chips and the button inside it. */
    .gh-portal-listpicker .gh-portal-listpicker-field {
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: 6px;
        padding: 6px;
        cursor: pointer;
    }

    /* Chips wrap onto more lines, so a field of several answers grows from an input's height:
       44px, or 42px on screens up to 1440px wide, as input-field.jsx and frame.styles.js set it. */
    .gh-portal-listpicker .gh-portal-listpicker-field.is-multiple {
        flex-wrap: wrap;
        height: auto;
        min-height: 44px;
    }

    @media (max-width: 1440px) {
        .gh-portal-listpicker .gh-portal-listpicker-field.is-multiple {
            min-height: 42px;
        }
    }

    /* Matches the look Portal's other read-only inputs take. */
    .gh-portal-popup-container:not(.preview) .gh-portal-listpicker .gh-portal-listpicker-field.is-read-only {
        background-color: var(--grey13);
        color: var(--grey9);
        cursor: default;
    }

    /* Focus shows on the field's border, as it does on an input, not as a ring around the
       button inside it. */
    .gh-portal-listpicker.is-open .gh-portal-listpicker-field,
    .gh-portal-listpicker-field:focus-within {
        border-color: var(--grey8);
    }

    .gh-portal-listpicker-trigger:focus-visible {
        outline: none;
    }

    .gh-portal-listpicker-chip {
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

    .gh-portal-listpicker-chip.is-read-only {
        padding-right: 8px;
        color: inherit;
    }

    .gh-portal-listpicker-chip-remove {
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

    .gh-portal-listpicker-chip-remove:hover {
        background: var(--grey11);
    }

    .gh-portal-listpicker-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .gh-portal-listpicker-trigger {
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

    .gh-portal-listpicker-trigger.has-value {
        color: inherit;
    }

    /* A field holding chips keeps the arrow at the end of its first row and leaves the arrow's
       room free, so the field grows only when the chips themselves need another row. The padding
       centres a row of 24px chips in the field's 42px inside its border, or 40px on screens up to
       1440px wide, where the arrow is centred too. */
    .gh-portal-listpicker .gh-portal-listpicker-field.is-filled {
        position: relative;
        align-content: flex-start;
        padding: 9px 34px 9px 6px;
    }

    .gh-portal-listpicker-field.is-filled .gh-portal-listpicker-chip {
        position: relative;
        z-index: 1;
    }

    /* Once chips are picked, they and the arrow say the field takes more, so the placeholder goes
       and the button lies under the chips across the whole field: a press anywhere but on a chip
       opens the list. */
    .gh-portal-listpicker-trigger.is-filled {
        position: absolute;
        inset: 0;
        min-width: 0;
        min-height: 0;
        padding: 0;
    }

    .gh-portal-listpicker-trigger.is-filled .gh-portal-listpicker-chevron {
        position: absolute;
        top: 13px;
        right: 10px;
    }

    @media (max-width: 1440px) {
        .gh-portal-listpicker .gh-portal-listpicker-field.is-filled {
            padding-block: 8px;
        }

        .gh-portal-listpicker-trigger.is-filled .gh-portal-listpicker-chevron {
            top: 12px;
        }
    }

    /* One answer stays on one line, cut short like a native select's, so the field keeps the
       height of the inputs around it. The list shows it whole. */
    .gh-portal-listpicker-value {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* Where the button it sits in when the answer can be changed would put it. */
    .gh-portal-listpicker-field.is-read-only > .gh-portal-listpicker-value {
        padding: 0 6px;
    }

    .gh-portal-listpicker-chevron {
        flex: none;
        width: 16px;
        height: 16px;
        background-image: ${CHEVRON};
        transition: transform 0.15s ease;
    }

    .gh-portal-listpicker.is-open .gh-portal-listpicker-chevron {
        transform: rotate(180deg);
    }

    .gh-portal-listpicker-popover {
        overflow: hidden;
        border: 1px solid var(--grey11);
        border-radius: 8px;
        background: var(--white);
        box-shadow: 0 14px 30px -10px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.06);
    }

    .gh-portal-listpicker-search {
        display: flex;
        flex: none;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        border-bottom: 1px solid var(--grey12);
        color: var(--grey8);
    }

    .gh-portal-listpicker-search input {
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

    .gh-portal-listpicker-empty {
        flex: none;
        padding: 14px;
        color: var(--grey5);
        font-size: 1.4rem;
        text-align: center;
    }

    /* Shrinks to the room the popover has, and scrolls within it. */
    .gh-portal-listpicker-list {
        flex: 0 1 auto;
        min-height: 0;
        max-height: ${MAX_LIST_HEIGHT}px;
        margin: 0;
        padding: 4px;
        overflow-y: auto;
        outline: none;
        list-style: none;
    }

    /* Whole pixels: 7px, a 20px line and 7px make a row exactly ${ROW_HEIGHT}px, so every row
       starts on the pixel grid and every tick is drawn the same. */
    .gh-portal-listpicker-option {
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

    .gh-portal-listpicker-option.is-active {
        background: var(--grey13);
    }

    /* The keyboard has nothing but this mark to follow, so it is ringed the way Portal rings a
       list row focused from the keyboard. */
    .gh-portal-listpicker-option.is-active.is-keyboard {
        box-shadow: inset 0 0 0 2px var(--brandcolor);
    }

    .gh-portal-listpicker-marker {
        position: relative;
        flex: none;
        width: 14px;
        height: 14px;
        border: 1.5px solid var(--grey9);
        border-radius: 4px;
    }

    .gh-portal-listpicker-marker.is-check {
        border: 0;
    }

    .gh-portal-listpicker-option[aria-selected="true"] .gh-portal-listpicker-marker {
        border-color: var(--brandcolor);
        background: var(--brandcolor);
    }

    .gh-portal-listpicker-option[aria-selected="true"] .gh-portal-listpicker-marker::after {
        content: "";
        position: absolute;
        top: 1px;
        left: 3.5px;
        width: 3.5px;
        height: 7px;
        border-right: 1.5px solid var(--white);
        border-bottom: 1.5px solid var(--white);
        transform: rotate(45deg);
    }

    .gh-portal-listpicker-option[aria-selected="true"] .gh-portal-listpicker-marker.is-check {
        background: none;
    }

    .gh-portal-listpicker-option[aria-selected="true"] .gh-portal-listpicker-marker.is-check::after {
        top: 2px;
        left: 4.5px;
        width: 4px;
        height: 8px;
        border-color: var(--brandcolor);
    }

    /* In the sheet, rows are sized for a finger and the list takes the sheet's remaining height. */
    .gh-portal-sheet .gh-portal-listpicker-search {
        margin: 4px 12px 0;
        border: 1px solid var(--grey11);
        border-radius: 8px;
    }

    .gh-portal-sheet .gh-portal-listpicker-list {
        flex: 1;
        max-height: none;
        padding: 4px 8px 12px;
        overscroll-behavior: contain;
    }

    .gh-portal-sheet .gh-portal-listpicker-option {
        min-height: 44px;
        font-size: 1.6rem;
    }
`;

const classes = (...names: Array<string | false>) => names.filter(Boolean).join(' ');

/** An option of the list: the answer it stands for, and what the list calls it. */
export interface ListOption<V extends string> {
  value: V;
  label: string;
}

/** A row of the list: an option, or, in a field that takes one answer, the row that clears it. */
interface Row<V extends string> {
  /** The answer the row picks, or null for the row that clears the answer. */
  option: V | null;
  label: string;
}

/**
 * The row Enter or Space picks, and whether a key put the highlight there. A row the pointer
 * highlights is shaded as faintly as a hover; one a key highlights is ringed too, since the
 * keyboard has nothing else to follow.
 */
interface Highlight {
  index: number;
  byKeyboard: boolean;
}

/**
 * The index of the first label at `from` or after it, wrapping round, that starts with `typed`, or
 * -1 when none does. `typed` must be lower-case.
 */
function startingWith(labels: readonly string[], typed: string, from: number): number {
  for (let step = 0; step < labels.length; step += 1) {
    const index = (from + step) % labels.length;
    if (labels[index]?.toLowerCase().startsWith(typed)) {
      return index;
    }
  }
  return -1;
}

/**
 * How many answers the field takes: several, shown as chips, or one, shown as text, where picking
 * closes the list. Only a field that takes one answer has the row that clears it, and shows its
 * answer as text, so only such a field says whether to offer the row and what text to show.
 */
type AnswerCount<V extends string> =
  | { multiple: true; clearable?: never; answerText?: never }
  | {
      multiple: false;
      /**
       * Whether the list's first row clears the answer held, as it does by default. A field whose
       * answer is only ever changed, such as a phone number's country, leaves the row out.
       */
      clearable?: boolean;
      /**
       * The text the field shows for the answer it holds, where that isn't the option's label,
       * whether the member may change it or only read it: a phone number's country shows as its
       * calling code, and the list names it in full.
       */
      answerText?: ((answer: V) => string) | undefined;
    };

type ListPickerProps<V extends string> = AnswerCount<V> & {
  /**
   * The id of the button that opens the list, or of the box holding the answers when read-only.
   */
  id: string;
  /**
   * The id of the label that names the field and its list. A field with no label of its own, such
   * as a phone number's country, is named by `label`.
   */
  labelId?: string | undefined;
  /** The field's name: the sheet's title, and the search box's placeholder. */
  label: string;
  options: readonly ListOption<V>[];
  /** The answers picked, in the order the field offers them. */
  value: readonly V[];
  /**
   * The element the list opens across, when it is more than the field: a control the field is one
   * part of, such as a phone number's input with its country.
   */
  alignTo?: React.RefObject<HTMLElement> | undefined;
  placeholder: string;
  invalid?: boolean;
  disabled?: boolean;
  /**
   * Shows what the field holds with nothing to pick from, for a field a member may only read: its
   * one answer as `answerText` gives it, where there is one, and otherwise every answer as a chip.
   */
  readOnly?: boolean;
  /** The id of the element that says why the field was refused, when it was. */
  describedBy?: string | undefined;
  onChange: (picked: V[]) => void;
};

/**
 * A field whose answers are picked from a list of options: one answer, shown as text, or several,
 * shown as chips. The list opens in a popover under the field, or in a bottom sheet on a phone.
 * Where the field takes one answer and has one, the list's first row clears it, unless the field
 * isn't clearable. A list of more than VISIBLE_ROWS options has a search box above it, which on a
 * touch screen waits to be tapped.
 *
 * From the keyboard, ↑ and ↓ move through the list, and Home and End jump to its ends except in the
 * search box, where they move the caret. Enter picks, as Space does outside the search box, Escape
 * closes the list, and typing jumps to an option as it does in a native select.
 */
export default function ListPicker<V extends string>({
  id,
  labelId,
  label,
  options,
  value,
  multiple,
  clearable = true,
  answerText,
  alignTo,
  placeholder,
  invalid,
  disabled,
  readOnly,
  describedBy,
  onChange,
}: ListPickerProps<V>) {
  // What names the field and its list: its label where it has one, and otherwise its name.
  const named = labelId ? { 'aria-labelledby': labelId } : { 'aria-label': label };
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [highlight, setHighlight] = useState<Highlight>({ index: 0, byKeyboard: false });
  const [query, setQuery] = useState('');
  const fieldRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typed = useRef({ letters: '', at: 0 });

  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const searchable = options.length > VISIBLE_ROWS;
  const term = query.trim().toLowerCase();
  // One answer is cleared the way a native select's is: once something is chosen, a first row
  // stands for no answer, named as Portal's selects name it. A search is for an option, so it
  // leaves that row out.
  const rowsFor = (searched: string): Row<V>[] => [
    ...(!multiple && clearable && value.length > 0 && !searched
      ? [{ option: null, label: t('(None)') }]
      : []),
    ...options
      .filter(({ label: text }) => !searched || text.toLowerCase().includes(searched))
      .map(({ value: option, label: text }) => ({ option, label: text })),
  ];
  // An answer the options leave out, which a member may only read, goes by the answer itself.
  const labelOf = (answer: V) => options.find((option) => option.value === answer)?.label ?? answer;
  const shown = rowsFor(term);
  const view = () => fieldRef.current?.ownerDocument.defaultView;

  const highlightRow = (index: number, byKeyboard: boolean) =>
    setHighlight((current) =>
      current.index === index && current.byKeyboard === byKeyboard
        ? current
        : { index, byKeyboard },
    );

  /**
   * The index of the first row holding an answer the member holds among the rows shown without a
   * search, or 0 when none does. Not found among `shown`, which holds the rows for the search as it
   * was before the change being made: both callers are showing the list without a search, one by
   * opening it and the other by emptying the search box.
   */
  const heldRow = () =>
    Math.max(
      0,
      rowsFor('').findIndex(({ option }) => option !== null && value.includes(option)),
    );

  const openList = (byKeyboard: boolean) => {
    if (disabled) {
      return;
    }
    const width = view()?.innerWidth;
    setSheet(width !== undefined && width < PHONE_WIDTH);
    setQuery('');
    typed.current = { letters: '', at: 0 };
    highlightRow(heldRow(), byKeyboard);
    setOpen(true);
  };

  /**
   * Moves focus to the search box, if there is one, or else to the list. On a touch screen the list
   * takes it either way, since focus in the search box would raise the on-screen keyboard over the
   * options.
   */
  const focusInside = () => {
    if (searchable && !view()?.matchMedia('(pointer: coarse)').matches) {
      searchRef.current?.focus();
    } else {
      listRef.current?.focus();
    }
  };

  /**
   * Closes the list, and moves focus back to the button that opens it when `returnFocus` is set.
   * Every close but a press outside the picker sets it, since focus may be in the panel and would
   * be left on the page's body once the panel goes. That includes a click on the field that closes
   * the list: Safari doesn't focus a button that is clicked, so focus stays in the panel.
   */
  const closeList = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  };

  const pick = (option: V | null) => {
    if (option === null) {
      onChange([]);
      closeList(true);
      return;
    }
    if (multiple) {
      onChange(
        options
          .map((candidate) => candidate.value)
          .filter((candidate) =>
            candidate === option ? !value.includes(option) : value.includes(candidate),
          ),
      );
      return;
    }
    onChange([option]);
    closeList(true);
  };

  const stillTyping = () => Date.now() - typed.current.at < TYPEAHEAD_PAUSE_MS;

  /**
   * Highlights an option by what is typed, as a native select does: the same letter pressed again
   * and again steps through the options that start with it, and different letters typed without a
   * pause build up the start of the option to find.
   */
  const typeAhead = (key: string) => {
    const letter = key.toLowerCase();
    const letters = (stillTyping() ? typed.current.letters : '') + letter;
    typed.current = { letters, at: Date.now() };
    const labels = shown.map(({ label: text }) => text);
    const sameLetter = [...letters].every((each) => each === letter);
    const match = sameLetter
      ? startingWith(labels, letter, highlight.index + 1)
      : startingWith(labels, letters, highlight.index);
    if (match !== -1) {
      highlightRow(match, true);
    }
  };

  // Before the browser paints, so the list never shows with focus still on the field.
  useLayoutEffect(() => {
    if (open) {
      focusInside();
    }
  }, [open, sheet]);

  const scrollToHighlight = () =>
    listRef.current?.querySelector('[data-active]')?.scrollIntoView({ block: 'nearest' });

  // The row the list opens on is brought into view, and so is each row a key moves the highlight
  // to. A row the pointer highlights is left where it is: it is under the pointer already, and
  // bringing a half-hidden one fully into view would scroll the list under the pointer.
  useEffect(() => {
    if (open) {
      scrollToHighlight();
    }
  }, [open]);

  useEffect(() => {
    if (open && highlight.byKeyboard) {
      scrollToHighlight();
    }
  }, [highlight]);

  const onListKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    // An input method composing text in the search box uses Enter, the arrows and other keys to
    // pick what it writes, so the list leaves them to it. Safari reports the key that ends a
    // composition with isComposing unset, but with the keyCode 229 every composing key has.
    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      return;
    }
    const inSearch = event.currentTarget === searchRef.current;
    const toRow = (index: number) => Math.max(0, Math.min(shown.length - 1, index));
    const moves: Record<string, number> = {
      ArrowDown: toRow(highlight.index + 1),
      ArrowUp: toRow(highlight.index - 1),
      // In the search box, Home and End move the caret.
      ...(inSearch ? {} : { Home: 0, End: toRow(shown.length - 1) }),
    };
    const move = moves[event.key];
    if (move !== undefined) {
      event.preventDefault();
      highlightRow(move, true);
    } else if (event.key === 'Enter' || (event.key === ' ' && !inSearch && !stillTyping())) {
      event.preventDefault();
      const row = shown[highlight.index];
      if (row !== undefined) {
        pick(row.option);
      }
    } else if (event.key === 'Tab' && !sheet) {
      // The popover is drawn at the end of Portal's popup, so focus goes back to the field first,
      // and Tab and Shift+Tab carry on from there as they would from a native select.
      closeList(true);
    } else if (event.key === 'Backspace' && inSearch && !query && multiple && value.length > 0) {
      // Backspace in an empty search box removes the last chip, as in a tag field.
      onChange(value.slice(0, -1));
    } else if (
      !inSearch &&
      event.key.length === 1 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      typeAhead(event.key);
    }
  };

  const list = (
    <ul
      ref={listRef}
      aria-activedescendant={shown.length > 0 ? optionId(highlight.index) : undefined}
      {...named}
      aria-multiselectable={multiple || undefined}
      className="gh-portal-listpicker-list"
      id={listId}
      role="listbox"
      tabIndex={0}
      onKeyDown={onListKeyDown}
    >
      {shown.map(({ option, label: text }, index) => (
        // Picked from the keyboard through the listbox's active option, so a row only answers
        // the pointer.
        <li
          key={option ?? ''}
          aria-selected={option !== null && value.includes(option)}
          className={classes(
            'gh-portal-listpicker-option',
            index === highlight.index && 'is-active',
            index === highlight.index && highlight.byKeyboard && 'is-keyboard',
          )}
          data-active={index === highlight.index || undefined}
          id={optionId(index)}
          role="option"
          onClick={() => pick(option)}
          // Keeps focus where it is, in the search box or the list, rather than letting the press
          // move it.
          onMouseDown={(event) => event.preventDefault()}
          onMouseMove={() => highlightRow(index, false)}
        >
          {/* A box for several answers, the cue a checkbox gives. For one, a space where a check
              marks the answer picked, as a menu marks its choice, keeping every row's text in
              line. */}
          <span
            aria-hidden="true"
            className={classes('gh-portal-listpicker-marker', !multiple && 'is-check')}
          />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );

  const search = searchable && (
    <div className="gh-portal-listpicker-search">
      <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3.5-3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      </svg>
      <input
        ref={searchRef}
        aria-activedescendant={shown.length > 0 ? optionId(highlight.index) : undefined}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded="true"
        {...named}
        autoComplete="off"
        placeholder={label}
        role="combobox"
        spellCheck={false}
        type="text"
        value={query}
        onChange={(event) => {
          const searched = event.target.value;
          setQuery(searched);
          // Emptying the search highlights the answer held, as opening the list does, rather
          // than the first row: in a list that takes one answer and holds one, the first row
          // without a search is the one that clears the answer, which Enter would pick.
          highlightRow(searched.trim() ? 0 : heldRow(), true);
        }}
        onKeyDown={onListKeyDown}
      />
    </div>
  );

  const nothingToPick = shown.length === 0 && (
    <div className="gh-portal-listpicker-empty">{t('No options found')}</div>
  );

  let fieldText = placeholder;
  if (multiple && value.length > 0) {
    fieldText = '';
  } else if (value[0] !== undefined) {
    fieldText = (answerText ?? labelOf)(value[0]);
  }
  // A field that takes one answer and says how to show it shows that text, as it does when the
  // answer can be changed, such as a phone number's country as its calling code, or the
  // placeholder while it holds none. Otherwise every answer is a chip, one or several, since an
  // option's text can hold a comma.
  if (readOnly) {
    const shownAs = !multiple && answerText ? fieldText : undefined;
    return (
      <div className="gh-portal-listpicker">
        <div
          {...named}
          className="gh-portal-input gh-portal-listpicker-field is-multiple is-read-only"
          data-test-input={id}
          id={id}
          role="group"
        >
          {shownAs !== undefined && <span className="gh-portal-listpicker-value">{shownAs}</span>}
          {shownAs === undefined && value.length > 0 && (
            <ul className="gh-portal-listpicker-chips">
              {value.map((answer) => (
                <li key={answer} className="gh-portal-listpicker-chip is-read-only">
                  {labelOf(answer)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={classes('gh-portal-listpicker', open && 'is-open')}>
      {/* A click on the field's empty space opens or closes the list, as a click on the button
          inside it does. */}
      <div
        ref={fieldRef}
        className={classes(
          'gh-portal-input',
          'gh-portal-listpicker-field',
          multiple && 'is-multiple',
          multiple && value.length > 0 && 'is-filled',
          Boolean(invalid) && 'error',
        )}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            if (open) {
              closeList(true);
            } else {
              openList(false);
            }
          }
        }}
      >
        {multiple &&
          value.map((answer) => (
            <span key={answer} className="gh-portal-listpicker-chip">
              <span>{labelOf(answer)}</span>
              <button
                aria-label={t('Remove {option}', { option: labelOf(answer) })}
                className="gh-portal-listpicker-chip-remove"
                disabled={disabled}
                type="button"
                onClick={() => {
                  onChange(value.filter((picked) => picked !== answer));
                  // The cross took focus when it was pressed and goes with its chip, so focus is
                  // put back where the member was working.
                  if (open) {
                    focusInside();
                  } else {
                    triggerRef.current?.focus();
                  }
                }}
              >
                <CrossIcon aria-hidden="true" height={12} width={12} />
              </button>
            </span>
          ))}
        {/* A combobox, as Shade's picker button is, which unlike a plain button can be marked
            invalid when the site refuses the list. The field's label names it, and a screen
            reader reads what it shows, the answer held, as its value. */}
        <button
          ref={triggerRef}
          aria-controls={listId}
          aria-describedby={describedBy}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={invalid || undefined}
          {...named}
          className={classes(
            'gh-portal-listpicker-trigger',
            !multiple && value.length > 0 && 'has-value',
            multiple && value.length > 0 && 'is-filled',
          )}
          data-test-input={id}
          disabled={disabled}
          id={id}
          role="combobox"
          type="button"
          // Enter on a button fires a click whose detail is 0, where a pointer's counts its
          // presses, so a list opened from the keyboard marks its highlighted option for the
          // keyboard.
          onClick={(event) => (open ? closeList(true) : openList(event.detail === 0))}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              openList(true);
            } else if (event.key === ' ') {
              event.preventDefault();
              if (open) {
                closeList(true);
              } else {
                openList(true);
              }
            }
          }}
          // Space is handled on the press, above, and its release is kept from clicking the
          // button. Picking with Space in a list that takes one answer focuses this button while
          // Space is still down, and Firefox clicks the focused button when Space is released,
          // which would open the list again.
          onKeyUp={(event) => {
            if (event.key === ' ') {
              event.preventDefault();
            }
          }}
        >
          <span className="gh-portal-listpicker-value">{fieldText}</span>
          <span aria-hidden="true" className="gh-portal-listpicker-chevron" />
        </button>
      </div>
      {open && !sheet && (
        <Popover
          align="stretch"
          alignTo={alignTo}
          anchor={fieldRef}
          className="gh-portal-listpicker-popover"
          fit
          onClose={(reason) => closeList(reason === 'escape')}
        >
          {search}
          {list}
          {nothingToPick}
        </Popover>
      )}
      {open && sheet && (
        <BottomSheet opener={fieldRef} title={label} onClose={() => closeList(true)}>
          {search}
          {list}
          {nothingToPick}
        </BottomSheet>
      )}
    </div>
  );
}
