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
import { tw } from '../../utils/tw';

// Map only the classes Portal styles so react-day-picker's stylesheet doesn't
// have to be shipped.
const classNames = {
  months: 'relative',
  month_caption: tw`mb-0.5 flex h-7 items-center justify-center text-14 font-semibold text-black`,
  nav: tw`pointer-events-none absolute inset-x-0 top-0 flex justify-between [&_button]:pointer-events-auto [&_button]:flex [&_button]:size-7 [&_button]:cursor-pointer [&_button]:items-center [&_button]:justify-center [&_button]:rounded-md [&_button]:border-none [&_button]:bg-transparent [&_button]:p-0 [&_button]:text-gray-900 [&_button:focus-visible]:rounded [&_button:hover:not([aria-disabled='true'])]:text-black [&_button[aria-disabled='true']]:cursor-default [&_button[aria-disabled='true']]:opacity-30 [&_svg]:size-4 [&_svg]:fill-current rtl:[&_svg]:-scale-x-100`,
  month_grid: 'gh-portal-datepicker-grid border-collapse',
  weekday: tw`w-[34px] pb-0.5 text-11 font-medium tracking-[0.3px] text-gray-600 uppercase`,
  day: 'gh-portal-datepicker-day h-[30px] p-0',
  day_button: tw`gh-portal-datepicker-day-button relative flex h-[30px] w-[34px] cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-0 text-13.5 text-black`,
  today: tw`[&_.gh-portal-datepicker-day-button]:after:absolute [&_.gh-portal-datepicker-day-button]:after:bottom-[3px] [&_.gh-portal-datepicker-day-button]:after:left-1/2 [&_.gh-portal-datepicker-day-button]:after:size-[3px] [&_.gh-portal-datepicker-day-button]:after:-translate-x-1/2 [&_.gh-portal-datepicker-day-button]:after:rounded-[50%] [&_.gh-portal-datepicker-day-button]:after:bg-brand [&_.gh-portal-datepicker-day-button]:after:content-['']`,
  selected: tw`gh-portal-datepicker-selected [&_.gh-portal-datepicker-day-button]:bg-brand [&_.gh-portal-datepicker-day-button]:text-white [&_.gh-portal-datepicker-day-button:hover:not(:disabled)]:bg-brand [&_.gh-portal-datepicker-day-button:hover:not(:disabled)]:opacity-[0.92] [&.gh-portal-datepicker-selected_.gh-portal-datepicker-day-button]:after:bg-white`,
  disabled: tw`gh-portal-datepicker-disabled [&_.gh-portal-datepicker-day-button]:cursor-default [&_.gh-portal-datepicker-day-button:hover]:bg-transparent [&.gh-portal-datepicker-disabled_.gh-portal-datepicker-day-button]:text-gray-500`,
  outside:
    'gh-portal-datepicker-outside [&.gh-portal-datepicker-outside_.gh-portal-datepicker-day-button]:text-gray-500',
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
    <div ref={containerRef} className="gh-portal-datepicker relative">
      <div ref={fieldRef} className="gh-portal-datepicker-field relative">
        {/* Keeps a native date input for locale-aware keyboard
                    editing; only the browser's calendar is replaced. */}
        <input
          className={
            tw`gh-portal-input mb-0 box-border block h-11 w-full appearance-none rounded-md border border-solid border-gray-300 bg-transparent px-3 py-0 text-15 tracking-[0.2px] [color:inherit] outline-none transition-input placeholder:text-gray-500 focus:border-gray-500 max-[1441px]:h-[42px] [&.error]:border-red [&.has-min-label:not(:focus)]:text-transparent [&.has-min-label:not(:focus)::-webkit-datetime-edit]:text-transparent [&::-webkit-calendar-picker-indicator]:hidden [@media(hover:none)]:text-[16px]!` +
            (hasError ? ' error' : '') +
            (showMinLabel ? ' has-min-label' : '')
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
          <span
            aria-hidden="true"
            className="pointer-events-none absolute start-[13px] top-1/2 -translate-y-1/2 text-15 [.gh-portal-input:focus~&]:opacity-0"
          >
            {minLabel}
          </span>
        )}
        <button
          ref={toggleRef}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={ariaLabel}
          className="hidden supports-[selector(::-webkit-calendar-picker-indicator)]:absolute supports-[selector(::-webkit-calendar-picker-indicator)]:end-3 supports-[selector(::-webkit-calendar-picker-indicator)]:top-1/2 supports-[selector(::-webkit-calendar-picker-indicator)]:flex supports-[selector(::-webkit-calendar-picker-indicator)]:size-[18px] supports-[selector(::-webkit-calendar-picker-indicator)]:-translate-y-1/2 supports-[selector(::-webkit-calendar-picker-indicator)]:cursor-pointer supports-[selector(::-webkit-calendar-picker-indicator)]:items-center supports-[selector(::-webkit-calendar-picker-indicator)]:justify-center supports-[selector(::-webkit-calendar-picker-indicator)]:border-none supports-[selector(::-webkit-calendar-picker-indicator)]:bg-transparent supports-[selector(::-webkit-calendar-picker-indicator)]:p-0 supports-[selector(::-webkit-calendar-picker-indicator)]:text-gray-600 supports-[selector(::-webkit-calendar-picker-indicator)]:[&_svg]:size-[18px]"
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
            className="gh-portal-datepicker-popover absolute z-[100] rounded-lg bg-white p-2.5 [box-shadow:0_8px_24px_rgba(0,0,0,0.12)]"
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
