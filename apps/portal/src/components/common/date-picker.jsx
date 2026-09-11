import AppContext from '../../app-context';
import CalendarIcon from '../../images/icons/calendar.svg?react';
import { DayPicker } from 'react-day-picker';
import { createPortal } from 'react-dom';
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { parseDateValue, toDateValue } from '../../utils/date-time';

export const DatePickerStyles = `
    .gh-portal-datepicker {
        position: relative;
    }

    .gh-portal-datepicker-field {
        position: relative;
    }

    .gh-portal-datepicker-field .gh-portal-input {
        width: 100%;
        margin-bottom: 0;
        box-sizing: border-box;
    }

    /* Focusing the field reveals the real segments so the date stays typable. */
    .gh-portal-datepicker-field .gh-portal-input.has-min-label:not(:focus),
    .gh-portal-datepicker-field .gh-portal-input.has-min-label:not(:focus)::-webkit-datetime-edit {
        color: transparent;
    }

    .gh-portal-datepicker-min-label {
        position: absolute;
        top: 50%;
        inset-inline-start: 13px;
        transform: translateY(-50%);
        font-size: 1.5rem;
        pointer-events: none;
    }

    .gh-portal-datepicker-field .gh-portal-input:focus ~ .gh-portal-datepicker-min-label {
        opacity: 0;
    }

    /* Hidden unless the browser gives us a handle on its own picker button —
       see the @supports below. Without that we can't suppress the native
       calendar, and two of them in one field is worse than the stock one. */
    .gh-portal-datepicker-toggle {
        display: none;
    }

    @supports selector(::-webkit-calendar-picker-indicator) {
        .gh-portal-datepicker-field .gh-portal-input::-webkit-calendar-picker-indicator {
            display: none;
        }

        .gh-portal-datepicker-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            top: 50%;
            inset-inline-end: 12px;
            width: 18px;
            height: 18px;
            padding: 0;
            transform: translateY(-50%);
            background: none;
            border: 0;
            color: var(--grey7);
            cursor: pointer;
        }

        .gh-portal-datepicker-toggle svg {
            width: 18px;
            height: 18px;
        }
    }

    /* Portalled outside the animated, overflow-hidden gift reveal to avoid
       clipping and layout shifts; placed from the field's measured rect. */
    .gh-portal-datepicker-popover {
        position: absolute;
        z-index: 100;
        padding: 10px;
        background: var(--white);
        border: 1px solid var(--grey90);
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }

    .gh-portal-datepicker-months {
        position: relative;
    }

    .gh-portal-datepicker-month-caption {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 28px;
        margin-bottom: 2px;
        font-size: 1.4rem;
        font-weight: 600;
        color: var(--grey0);
    }

    .gh-portal-datepicker-nav {
        position: absolute;
        top: 0;
        inset-inline: 0;
        display: flex;
        justify-content: space-between;
        pointer-events: none;
    }

    .gh-portal-datepicker-nav button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        background: none;
        border: 0;
        border-radius: 6px;
        color: var(--grey3);
        cursor: pointer;
        pointer-events: auto;
    }

    .gh-portal-datepicker-nav button:hover:not([aria-disabled='true']) {
        background: var(--grey96);
        color: var(--grey0);
    }

    .gh-portal-datepicker-nav button[aria-disabled='true'] {
        opacity: 0.3;
        cursor: default;
    }

    .gh-portal-datepicker-nav svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
    }

    /* RTL gets the chevrons mirrored, not just repositioned — react-day-picker
       swaps which button means previous, but the glyph itself still points the
       way it was drawn. */
    html[dir="rtl"] .gh-portal-datepicker-nav svg {
        transform: scale(-1, 1);
    }

    .gh-portal-datepicker-grid {
        border-collapse: collapse;
    }

    .gh-portal-datepicker-weekday {
        width: 34px;
        padding-bottom: 2px;
        font-size: 1.1rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        color: var(--grey7);
    }

    /* Sizing the cell keeps every row a row tall whether or not it has
       anything in it. */
    .gh-portal-datepicker-day {
        height: 30px;
        padding: 0;
    }

    .gh-portal-datepicker-day-button {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 30px;
        padding: 0;
        background: none;
        border: 0;
        border-radius: 6px;
        font-size: 1.35rem;
        color: var(--grey0);
        cursor: pointer;
    }

    .gh-portal-datepicker-day-button:hover:not(:disabled) {
        background: var(--grey96);
    }

    .gh-portal-datepicker-today .gh-portal-datepicker-day-button::after {
        content: '';
        position: absolute;
        bottom: 3px;
        left: 50%;
        width: 3px;
        height: 3px;
        transform: translateX(-50%);
        border-radius: 50%;
        background: var(--brandcolor);
    }

    .gh-portal-datepicker-selected .gh-portal-datepicker-day-button::after {
        background: var(--white);
    }

    .gh-portal-datepicker-selected .gh-portal-datepicker-day-button {
        background: var(--brandcolor);
        color: var(--white);
    }

    /* Dim the brand fill on hover to preserve the selected day's white text. */
    .gh-portal-datepicker-selected .gh-portal-datepicker-day-button:hover:not(:disabled) {
        background: var(--brandcolor);
        opacity: 0.92;
    }

    .gh-portal-datepicker-outside .gh-portal-datepicker-day-button {
        color: var(--grey8);
    }

    .gh-portal-datepicker-disabled .gh-portal-datepicker-day-button {
        color: var(--grey8);
        cursor: default;
    }

    .gh-portal-datepicker-disabled .gh-portal-datepicker-day-button:hover {
        background: none;
    }
`;

// Map only the classes Portal styles so react-day-picker's stylesheet doesn't
// have to be shipped.
const classNames = {
  months: 'gh-portal-datepicker-months',
  month_caption: 'gh-portal-datepicker-month-caption',
  nav: 'gh-portal-datepicker-nav',
  month_grid: 'gh-portal-datepicker-grid',
  weekday: 'gh-portal-datepicker-weekday',
  day: 'gh-portal-datepicker-day',
  day_button: 'gh-portal-datepicker-day-button',
  today: 'gh-portal-datepicker-today',
  selected: 'gh-portal-datepicker-selected',
  disabled: 'gh-portal-datepicker-disabled',
  outside: 'gh-portal-datepicker-outside',
};

const POPOVER_GAP = 6;

// Render outside the clipped gift reveal, falling back to the owning
// document's body.
function getPopoverHost(node) {
  return node?.closest('.gh-portal-popup-container') || node?.ownerDocument?.body || null;
}

// The nearest scrolling ancestor is the real viewport: Portal's popup is a
// scrolling box inside a full-height iframe.
function getVisibleBox(node) {
  const view = node?.ownerDocument?.defaultView;
  for (let el = node?.parentElement; el && view; el = el.parentElement) {
    const { overflowY } = view.getComputedStyle(el);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return el.getBoundingClientRect();
    }
  }
  const height = view?.innerHeight || node?.ownerDocument?.documentElement?.clientHeight || 0;
  return height ? { top: 0, bottom: height } : null;
}

// Intl reports the week start as 1–7 (Monday–Sunday); react-day-picker counts
// 0–6 from Sunday. Older browsers expose weekInfo as a property instead of a
// method, or not at all — fall back to Sunday.
function getWeekStart(locale) {
  try {
    const info = new Intl.Locale(locale).getWeekInfo?.() ?? new Intl.Locale(locale).weekInfo;
    const firstDay = info?.firstDay;
    return firstDay ? firstDay % 7 : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * A native date input with a custom calendar popover. Values are `YYYY-MM-DD`
 * strings in and out, matching an `<input type="date">`.
 */
const DatePicker = ({
  id,
  value,
  onChange,
  min,
  max,
  hasError = false,
  // Shown in place of the date while the value sits on `min` — the gift flow
  // reads today as "Now" rather than a date.
  minLabel = null,
  ariaLabel,
}) => {
  const { locale: siteLocale = 'en', dir = 'ltr' } = useContext(AppContext);
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const containerRef = useRef(null);
  const fieldRef = useRef(null);
  const toggleRef = useRef(null);
  const popoverRef = useRef(null);

  const selected = parseDateValue(value);
  const minDate = parseDateValue(min);
  const maxDate = parseDateValue(max);

  // The publication locale is stored unvalidated ('en_US' passes the
  // settings check but Intl rejects it), so fall back to English rather
  // than crash the field mid-render.
  const locale = useMemo(() => {
    try {
      new Intl.DateTimeFormat(siteLocale);
      return siteLocale;
    } catch (e) {
      return 'en';
    }
  }, [siteLocale]);

  // Rebuilt only when the locale changes: constructing a DateTimeFormat is
  // the expensive part, and these run for every cell on every render.
  const formats = useMemo(
    () => ({
      monthCaption: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
      day: new Intl.DateTimeFormat(locale, { day: 'numeric' }),
    }),
    [locale],
  );

  const weekStartsOn = useMemo(() => getWeekStart(locale), [locale]);

  // Measures after render in the portal host's coordinate space.
  const position = useCallback(() => {
    const field = fieldRef.current;
    const target = getPopoverHost(field);
    const popover = popoverRef.current;
    if (!field || !target || !popover) {
      return;
    }
    const rect = field.getBoundingClientRect();
    const host = target.getBoundingClientRect();
    const visible = getVisibleBox(field);
    const height = popover.offsetHeight;

    const spaceBelow = visible ? visible.bottom - rect.bottom : Infinity;
    const spaceAbove = visible ? rect.top - visible.top : 0;
    const flip = spaceBelow < height + POPOVER_GAP && spaceAbove > spaceBelow;

    // translateY rather than a measured height, so a flipped box hangs from
    // the field's top edge and grows away from it.
    setPopoverStyle({
      top: flip ? rect.top - host.top - POPOVER_GAP : rect.bottom - host.top + POPOVER_GAP,
      right: host.right - rect.right,
      transform: flip ? 'translateY(-100%)' : undefined,
    });
  }, []);

  // Layout effect, not a plain one: the popover is measured and placed before
  // the browser paints, so it never shows up in the wrong spot first.
  useLayoutEffect(() => {
    if (isOpen) {
      position();
    }
  }, [isOpen, position]);

  // Portal renders inside an iframe, so the global `document` here is the
  // parent page's — listeners have to go on the element's own document or
  // they never fire. Scroll is captured because it's the popup
  // wrapper that scrolls, not the document.
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const node = containerRef.current;
    const doc = node?.ownerDocument;
    if (!doc) {
      return;
    }
    const onPointerDown = (event) => {
      if (
        !node.contains(event.target) &&
        !event.target.closest?.('.gh-portal-datepicker-popover')
      ) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        toggleRef.current?.focus();
      }
    };
    doc.addEventListener('pointerdown', onPointerDown);
    doc.addEventListener('keydown', onKeyDown);
    doc.addEventListener('scroll', position, true);
    doc.defaultView?.addEventListener('resize', position);
    return () => {
      doc.removeEventListener('pointerdown', onPointerDown);
      doc.removeEventListener('keydown', onKeyDown);
      doc.removeEventListener('scroll', position, true);
      doc.defaultView?.removeEventListener('resize', position);
    };
  }, [isOpen, position]);

  const toggle = () => setIsOpen((currentlyOpen) => !currentlyOpen);

  const handleSelect = (date) => {
    if (!date) {
      return;
    }
    onChange(toDateValue(date));
    setIsOpen(false);
    toggleRef.current?.focus();
  };

  const showMinLabel = !!minLabel && !!value && value === min;

  return (
    <div ref={containerRef} className="gh-portal-datepicker">
      <div ref={fieldRef} className="gh-portal-datepicker-field">
        {/* Keeps a native date input for locale-aware keyboard
                    editing; only the browser's calendar is replaced. */}
        <input
          className={
            'gh-portal-input' + (hasError ? ' error' : '') + (showMinLabel ? ' has-min-label' : '')
          }
          data-test-input={id}
          id={id}
          max={max}
          min={min}
          type="date"
          value={value}
          // Restores the minimum on blur; date inputs report ''
          // mid-edit while their segments are incomplete.
          onBlur={(event) => !event.target.value && onChange(min)}
          onChange={(event) => onChange(event.target.value)}
        />
        {showMinLabel && (
          <span aria-hidden="true" className="gh-portal-datepicker-min-label">
            {minLabel}
          </span>
        )}
        <button
          ref={toggleRef}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={ariaLabel}
          className="gh-portal-datepicker-toggle"
          data-testid="datepicker-toggle"
          type="button"
          onClick={toggle}
        >
          <CalendarIcon aria-hidden="true" focusable="false" />
        </button>
      </div>
      {isOpen &&
        createPortal(
          <div
            aria-label={ariaLabel}
            className="gh-portal-datepicker-popover"
            data-testid="datepicker-popover"
            role="dialog"
            ref={popoverRef}
            style={popoverStyle || { visibility: 'hidden' }}
          >
            <DayPicker
              classNames={classNames}
              dir={dir}
              defaultMonth={selected || minDate}
              disabled={[
                ...(minDate ? [{ before: minDate }] : []),
                ...(maxDate ? [{ after: maxDate }] : []),
              ]}
              endMonth={maxDate}
              // Six rows every month, so paging can't change the height the
              // placement above was measured from.
              fixedWeeks
              formatters={{
                formatCaption: (date) => formats.monthCaption.format(date),
                formatWeekdayName: (date) => formats.weekday.format(date),
                formatDay: (date) => formats.day.format(date),
              }}
              mode="single"
              selected={selected}
              showOutsideDays
              startMonth={minDate}
              weekStartsOn={weekStartsOn}
              onSelect={handleSelect}
            />
          </div>,
          getPopoverHost(fieldRef.current),
        )}
    </div>
  );
};

export default DatePicker;
