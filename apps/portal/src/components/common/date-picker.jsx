import AppContext from '../../app-context';
import CalendarIcon from '../../images/icons/calendar.svg?react';
import {DayPicker} from 'react-day-picker';
import {createPortal} from 'react-dom';
// Portal is on React 17, so no useId here — and nothing needs to reference the
// popover by id anyway.
import {useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';

export const DatePickerStyles = `
    .gh-portal-datepicker {
        position: relative;
    }

    .gh-portal-datepicker-field {
        position: relative;
    }

    /* Matches the sibling text inputs exactly — no fixed height, so it tracks
       the base input height at every breakpoint. */
    .gh-portal-datepicker-field .gh-portal-input {
        width: 100%;
        margin-bottom: 0;
        box-sizing: border-box;
    }

    /* Only while unfocused: focusing the field for keyboard editing shows the
       real segments again (the overlay yields below), so the date can be typed. */
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

    /* Chrome and Safari only; Firefox has no equivalent pseudo-element, so it
       keeps its native button and never reaches this block. */
    @supports selector(::-webkit-calendar-picker-indicator) {
        /* The field stays typable; only the browser's own calendar goes. */
        .gh-portal-datepicker-field .gh-portal-input::-webkit-calendar-picker-indicator {
            display: none;
        }

        /* Aligned to the field's 12px padding like any trailing icon. 18px
           keeps it a field affordance, clearly below the 20px brand marks
           heading each question while still reading larger than the 15px
           value beside it. */
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

    /* Rendered into the popup container rather than next to the field, and
       placed from the field's measured rect (see position()).
       .gh-portal-gift-checkout-reveal animates its height from its content
       (grid-template-rows: 0fr -> 1fr) and clips with overflow: hidden — so a
       popover living inside it grew the reveal by its own height, shoving
       everything below down the page, and got clipped for its trouble. */
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

    /* At the first or last selectable month. react-day-picker marks these
       aria-disabled rather than disabled — the click is already a no-op, so
       this is only about not looking live. */
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

    .gh-portal-datepicker-day {
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

    /* Today is marked with a dot under the number rather than by recolouring
       it: brand-coloured text reads as a selected or otherwise special state,
       and it competed with the actual selection sitting next to it. */
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

    /* The selected day is already filled with the brand colour, so its dot
       flips to white to stay visible. */
    .gh-portal-datepicker-selected .gh-portal-datepicker-day-button::after {
        background: var(--white);
    }

    .gh-portal-datepicker-selected .gh-portal-datepicker-day-button {
        background: var(--brandcolor);
        color: var(--white);
    }

    /* Same hover as the primary action button (see ActionButtonStyles): dim the
       brand fill rather than swapping it for the grey used by unselected days,
       which left white text on a near-white background. */
    .gh-portal-datepicker-selected .gh-portal-datepicker-day-button:hover:not(:disabled) {
        background: var(--brandcolor);
        opacity: 0.92;
    }

    .gh-portal-datepicker-disabled .gh-portal-datepicker-day-button,
    .gh-portal-datepicker-outside .gh-portal-datepicker-day-button {
        color: var(--grey8);
        cursor: default;
    }

    .gh-portal-datepicker-disabled .gh-portal-datepicker-day-button:hover {
        background: none;
    }
`;

// react-day-picker's own class names are dropped in favour of these so its
// stylesheet doesn't have to be shipped — Portal injects CSS as a string, and
// only the elements below are actually styled.
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
    outside: 'gh-portal-datepicker-outside'
};

const POPOVER_GAP = 6;

// Where the popover is rendered: the popup container, which sits outside the
// gift page's animated reveal and clips nothing. Falling back to the body keeps
// the component usable anywhere else in Portal.
function getPopoverHost(node) {
    return node?.closest('.gh-portal-popup-container') || node?.ownerDocument?.body || null;
}

// What the reader can actually see at once. Portal's popup is a scrolling box
// inside a full-height iframe, so the window is the wrong yardstick — the
// nearest scrolling ancestor is the real viewport here.
function getVisibleBox(node) {
    const view = node?.ownerDocument?.defaultView;
    for (let el = node?.parentElement; el && view; el = el.parentElement) {
        const {overflowY} = view.getComputedStyle(el);
        if (overflowY === 'auto' || overflowY === 'scroll') {
            return el.getBoundingClientRect();
        }
    }
    const height = view?.innerHeight || node?.ownerDocument?.documentElement?.clientHeight || 0;
    return height ? {top: 0, bottom: height} : null;
}

// "2026-08-03" as a local date. `new Date(string)` would read it as UTC and
// land on the previous day for anyone west of Greenwich.
function parseDateValue(value) {
    if (!value) {
        return undefined;
    }
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) {
        return undefined;
    }
    return new Date(year, month - 1, day);
}

function toDateValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Which day the week starts on, per the locale rather than a fixed Sunday.
// Intl reports 1–7 (Monday–Sunday); react-day-picker counts 0–6 from Sunday.
// Older browsers expose the info as a property instead of a method, and the
// oldest have neither — Sunday is date-fns' own default, so fall back to that.
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
 * A date field whose editing surface is a calendar rather than the browser's
 * own control, which looks different on every platform.
 *
 * Values are `YYYY-MM-DD` strings in and out, matching what an `<input
 * type="date">` would give, so callers keep comparing them as strings.
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
    minLabel,
    ariaLabel
}) => {
    const {locale = 'en', dir = 'ltr'} = useContext(AppContext);
    const [isOpen, setIsOpen] = useState(false);
    const [popoverStyle, setPopoverStyle] = useState(null);
    const containerRef = useRef(null);
    const fieldRef = useRef(null);
    const toggleRef = useRef(null);
    const popoverRef = useRef(null);

    const selected = parseDateValue(value);
    const minDate = parseDateValue(min);
    const maxDate = parseDateValue(max);

    // Rebuilt only when the locale changes: constructing a DateTimeFormat is
    // the expensive part, and these run for every cell on every render.
    const formats = useMemo(() => ({
        monthCaption: new Intl.DateTimeFormat(locale, {month: 'long', year: 'numeric'}),
        weekday: new Intl.DateTimeFormat(locale, {weekday: 'short'}),
        day: new Intl.DateTimeFormat(locale, {day: 'numeric'})
    }), [locale]);

    const weekStartsOn = useMemo(() => getWeekStart(locale), [locale]);

    // The popover is portalled to the popup container, so its coordinates are
    // measured in that element's space. Both rects are viewport-relative and
    // the container carries no scale, so subtracting is exact.
    //
    // Runs after the calendar has rendered because the decision needs its real
    // height — a month spanning six weeks is a row taller than one spanning
    // five, and the field sits low enough in the form for that to matter.
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

        // Below by default; above only when it genuinely doesn't fit below and
        // there's more room up there.
        const spaceBelow = visible ? visible.bottom - rect.bottom : Infinity;
        const spaceAbove = visible ? rect.top - visible.top : 0;
        const flip = spaceBelow < height + POPOVER_GAP && spaceAbove > spaceBelow;

        // Right-aligned: the calendar is narrower than the field, and hanging
        // it from the same edge as the icon that opens it keeps the two
        // visually tied together.
        setPopoverStyle({
            top: flip
                ? rect.top - host.top - height - POPOVER_GAP
                : rect.bottom - host.top + POPOVER_GAP,
            right: host.right - rect.right
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
            if (!node.contains(event.target) && !event.target.closest?.('.gh-portal-datepicker-popover')) {
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

    const toggle = () => setIsOpen(currentlyOpen => !currentlyOpen);

    const handleSelect = (date) => {
        if (!date) {
            return;
        }
        onChange(toDateValue(date));
        setIsOpen(false);
        toggleRef.current?.focus();
    };

    // The input keeps the real value underneath: this only covers its rendered
    // text, and yields as soon as the field is focused for typing.
    const showMinLabel = !!minLabel && !!value && value === min;

    return (
        <div ref={containerRef} className='gh-portal-datepicker'>
            <div ref={fieldRef} className='gh-portal-datepicker-field'>
                {/* Still a native date input: segment-by-segment typing, in the
                    reader's own locale order, is worth keeping. Only the
                    browser's calendar is replaced — see the @supports block,
                    which hides its picker button in favour of ours. */}
                <input
                    className={'gh-portal-input' + (hasError ? ' error' : '') + (showMinLabel ? ' has-min-label' : '')}
                    data-test-input={id}
                    id={id}
                    max={max}
                    min={min}
                    type='date'
                    value={value}
                    // Never rests empty: a cleared field snaps back to the
                    // minimum once focus leaves. Only on blur — mid-edit the
                    // input reports '' while its segments are incomplete, and
                    // restoring a value then would fight the typing.
                    onBlur={event => !event.target.value && onChange(min)}
                    onChange={event => onChange(event.target.value)}
                />
                {showMinLabel && (
                    <span aria-hidden='true' className='gh-portal-datepicker-min-label'>{minLabel}</span>
                )}
                <button
                    ref={toggleRef}
                    aria-expanded={isOpen}
                    aria-haspopup='dialog'
                    aria-label={ariaLabel}
                    className='gh-portal-datepicker-toggle'
                    data-testid='datepicker-toggle'
                    type='button'
                    onClick={toggle}
                >
                    <CalendarIcon aria-hidden='true' focusable='false' />
                </button>
            </div>
            {isOpen && createPortal((
                <div
                    aria-label={ariaLabel}
                    className='gh-portal-datepicker-popover'
                    data-testid='datepicker-popover'
                    role='dialog'
                    ref={popoverRef}
                    style={popoverStyle || {visibility: 'hidden'}}
                >
                    <DayPicker
                        classNames={classNames}
                        dir={dir}
                        disabled={[
                            ...(minDate ? [{before: minDate}] : []),
                            ...(maxDate ? [{after: maxDate}] : [])
                        ]}
                        endMonth={maxDate}
                        formatters={{
                            formatCaption: date => formats.monthCaption.format(date),
                            formatWeekdayName: date => formats.weekday.format(date),
                            formatDay: date => formats.day.format(date)
                        }}
                        mode='single'
                        selected={selected}
                        startMonth={minDate}
                        weekStartsOn={weekStartsOn}
                        onMonthChange={position}
                        onSelect={handleSelect}
                    />
                </div>
            ), getPopoverHost(fieldRef.current))}
        </div>
    );
};

export default DatePicker;
