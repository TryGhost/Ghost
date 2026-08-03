import {fireEvent, render} from '../../../utils/test-utils';
import DatePicker from '../../../../src/components/common/date-picker';

// Fixed so "today" and the month grid don't drift with the calendar.
const MIN = '2026-08-03';
const MAX = '2027-08-03';

const renderPicker = (props = {}, contextOverrides = {}) => {
    const onChange = vi.fn();
    const utils = render(
        <DatePicker
            ariaLabel='Delivery date'
            id='test-date'
            max={MAX}
            min={MIN}
            value={MIN}
            onChange={onChange}
            {...props}
        />,
        {overrideContext: contextOverrides}
    );
    return {...utils, onChange};
};

// The calendar opens from the icon only — the field itself stays a typable
// date input.
const openPicker = ({getByTestId}) => {
    fireEvent.click(getByTestId('datepicker-toggle'));
};

const field = ({container}) => container.querySelector('.gh-portal-datepicker-field input');

// Day buttons are named for assistive tech with the full date ("Wednesday,
// August 12th, 2026"), so they're reached by the number they actually show.
const dayButton = ({getByText}, day) => getByText(String(day), {selector: 'button.gh-portal-datepicker-day-button'});

describe('DatePicker', () => {
    it('shows the minLabel while the field sits on the minimum', () => {
        const utils = renderPicker({minLabel: 'Now'});

        expect(utils.getByText('Now')).toBeInTheDocument();
        expect(field(utils)).toHaveClass('has-min-label');
    });

    it('shows the real date once a later day is chosen', () => {
        const utils = renderPicker({minLabel: 'Now', value: '2026-08-12'});

        expect(utils.queryByText('Now')).not.toBeInTheDocument();
        expect(field(utils)).not.toHaveClass('has-min-label');
    });

    // The field is a native date input, so the reader can type the date
    // segment by segment in their own locale's order.
    it('keeps the date typable', () => {
        const utils = renderPicker();

        expect(field(utils)).toHaveAttribute('type', 'date');
        expect(field(utils)).toHaveAttribute('min', MIN);
        expect(field(utils)).toHaveAttribute('max', MAX);
    });

    it('reports what was typed', () => {
        const utils = renderPicker();

        fireEvent.change(field(utils), {target: {value: '2026-09-01'}});

        expect(utils.onChange).toHaveBeenCalledWith('2026-09-01');
    });

    // Mid-edit a date input reports '' while its segments are incomplete, so
    // this only settles on blur — restoring a value while typing would fight it.
    it('snaps a cleared field back to the minimum on blur', () => {
        const utils = renderPicker();

        fireEvent.blur(field(utils), {target: {value: ''}});

        expect(utils.onChange).toHaveBeenCalledWith(MIN);
    });

    it('opens from the calendar icon', () => {
        const utils = renderPicker();

        expect(utils.queryByTestId('datepicker-popover')).not.toBeInTheDocument();
        openPicker(utils);
        expect(utils.getByTestId('datepicker-popover')).toBeInTheDocument();
    });

    // Clicking into the field is how you type, so it must not also throw a
    // calendar over what you're editing.
    it('does not open when the field itself is clicked', () => {
        const utils = renderPicker();

        fireEvent.click(field(utils));
        fireEvent.focus(field(utils));

        expect(utils.queryByTestId('datepicker-popover')).not.toBeInTheDocument();
    });

    // The value contract is the one an <input type="date"> had, so callers can
    // keep comparing bounds as plain strings.
    it('reports the chosen day as a YYYY-MM-DD string', () => {
        const utils = renderPicker();
        openPicker(utils);

        fireEvent.click(dayButton(utils, 12));

        expect(utils.onChange).toHaveBeenCalledWith('2026-08-12');
    });

    it('closes once a day is chosen', () => {
        const utils = renderPicker();
        openPicker(utils);

        fireEvent.click(dayButton(utils, 12));

        expect(utils.queryByTestId('datepicker-popover')).not.toBeInTheDocument();
    });

    // Parsed as a local date rather than UTC — `new Date('2026-08-03')` would
    // land on the 2nd anywhere west of Greenwich.
    it('does not shift the selected day across timezones', () => {
        const utils = renderPicker({value: '2026-08-12'});
        openPicker(utils);

        expect(dayButton(utils, 12).closest('td')).toHaveClass('gh-portal-datepicker-selected');
    });

    it('refuses days before the minimum', () => {
        const utils = renderPicker();
        openPicker(utils);

        fireEvent.click(dayButton(utils, 2));

        expect(utils.onChange).not.toHaveBeenCalled();
    });

    it('renders the calendar outside the field, not within it', () => {
        const utils = renderPicker();
        openPicker(utils);

        const popover = utils.getByTestId('datepicker-popover');
        expect(popover).toBeInTheDocument();
        expect(utils.container.querySelector('.gh-portal-datepicker')).not.toContainElement(popover);
    });

    // Placement is measured against the nearest scrolling ancestor, not the
    // window: Portal's popup is a scrolling box inside a full-height iframe, so
    // the window would report far more room than the reader can actually see.
    it('hangs below the field when there is room', () => {
        const utils = renderPicker();
        openPicker(utils);

        const popover = utils.getByTestId('datepicker-popover');
        // jsdom reports every rect as zero, so the only honest assertion here
        // is that a placement was computed at all rather than left hidden.
        expect(popover.style.top).not.toBe('');
        expect(popover.style.right).not.toBe('');
        expect(popover.style.visibility).not.toBe('hidden');
    });

    it('marks the field as invalid when asked', () => {
        const utils = renderPicker({hasError: true});

        expect(field(utils)).toHaveClass('error');
    });

    it('closes on Escape', () => {
        const utils = renderPicker();
        openPicker(utils);

        fireEvent.keyDown(document, {key: 'Escape'});

        expect(utils.queryByTestId('datepicker-popover')).not.toBeInTheDocument();
    });
});
