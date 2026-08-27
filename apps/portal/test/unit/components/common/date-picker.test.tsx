import { fireEvent, render } from '../../../utils/test-utils';
import DatePicker from '../../../../src/components/common/date-picker';

const MIN = '2026-08-03';
const MAX = '2027-08-03';
const SIX_FULL_WEEKS = [7, 7, 7, 7, 7, 7];

type RenderPickerUtils = ReturnType<typeof render> & { onChange: ReturnType<typeof vi.fn> };

const renderPicker = (
  props: Record<string, unknown> = {},
  contextOverrides: Record<string, unknown> = {},
): RenderPickerUtils => {
  const onChange = vi.fn();
  const utils = render(
    <DatePicker
      ariaLabel="Delivery date"
      id="test-date"
      max={MAX}
      min={MIN}
      value={MIN}
      onChange={onChange}
      {...props}
    />,
    { overrideContext: contextOverrides },
  );
  return { ...utils, onChange };
};

const openPicker = ({ getByTestId }: RenderPickerUtils) => {
  fireEvent.click(getByTestId('datepicker-toggle'));
};

// Day buttons per week row. `fixedWeeks` always renders six rows, but rows at
// the navigation bounds can contain no buttons because their filler days are
// hidden. The explicit day-cell height keeps those empty rows full-height.
const rowFills = (utils: RenderPickerUtils): number[] =>
  Array.from(
    utils.getByTestId('datepicker-popover').querySelectorAll('.gh-portal-datepicker-grid tbody tr'),
  ).map((row) => row.querySelectorAll('.gh-portal-datepicker-day-button').length);

const field = ({ container }: RenderPickerUtils): HTMLInputElement => {
  const input = container.querySelector<HTMLInputElement>('.gh-portal-datepicker-field input');
  if (!input) {
    throw new Error('Expected date picker input');
  }
  return input;
};

// Day buttons are named for assistive tech with the full date ("Wednesday,
// August 12th, 2026"), so they're reached by the number they actually show.
const dayButton = ({ getByText }: RenderPickerUtils, day: number) =>
  getByText(String(day), { selector: 'button.gh-portal-datepicker-day-button' });

describe('DatePicker', () => {
  it('shows the minLabel while the field sits on the minimum', () => {
    const utils = renderPicker({ minLabel: 'Now' });

    expect(utils.getByText('Now')).toBeInTheDocument();
    expect(field(utils)).toHaveClass('has-min-label');
  });

  it('shows the real date once a later day is chosen', () => {
    const utils = renderPicker({ minLabel: 'Now', value: '2026-08-12' });

    expect(utils.queryByText('Now')).not.toBeInTheDocument();
    expect(field(utils)).not.toHaveClass('has-min-label');
  });

  it('keeps the date typable', () => {
    const utils = renderPicker();

    expect(field(utils)).toHaveAttribute('type', 'date');
    expect(field(utils)).toHaveAttribute('min', MIN);
    expect(field(utils)).toHaveAttribute('max', MAX);
  });

  it('reports what was typed', () => {
    const utils = renderPicker();

    fireEvent.change(field(utils), { target: { value: '2026-09-01' } });

    expect(utils.onChange).toHaveBeenCalledWith('2026-09-01');
  });

  // Mid-edit a date input reports '' while its segments are incomplete, so
  // this only settles on blur — restoring a value while typing would fight it.
  it('snaps a cleared field back to the minimum on blur', () => {
    const utils = renderPicker();

    fireEvent.blur(field(utils), { target: { value: '' } });

    expect(utils.onChange).toHaveBeenCalledWith(MIN);
  });

  it('opens from the calendar icon', () => {
    const utils = renderPicker();

    expect(utils.queryByTestId('datepicker-popover')).not.toBeInTheDocument();
    openPicker(utils);
    expect(utils.getByTestId('datepicker-popover')).toBeInTheDocument();
  });

  it('does not open when the field itself is clicked', () => {
    const utils = renderPicker();

    fireEvent.click(field(utils));
    fireEvent.focus(field(utils));

    expect(utils.queryByTestId('datepicker-popover')).not.toBeInTheDocument();
  });

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
    const utils = renderPicker({ value: '2026-08-12' });
    openPicker(utils);

    expect(dayButton(utils, 12).closest('td')).toHaveClass('gh-portal-datepicker-selected');
  });

  it('refuses days before the minimum', () => {
    const utils = renderPicker();
    openPicker(utils);

    fireEvent.click(utils.getByLabelText(/August 2nd, 2026/));

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

  // September 2026 spans five weeks of its own, August 2026 six. Filling the
  // short ones out with the neighbouring month's days keeps the calendar one
  // height whatever month is showing.
  describe('fixed height', () => {
    it('fills every cell of a month inside the range', () => {
      const utils = renderPicker();
      openPicker(utils);

      fireEvent.click(utils.getByLabelText(/next month/i));

      expect(rowFills(utils)).toEqual(SIX_FULL_WEEKS);
    });

    // At the edges of the range the filler belongs to months that can't be
    // navigated to, and react-day-picker suppresses those days. The rows are
    // still there, and `.gh-portal-datepicker-day` is sized so a row holding
    // nothing keeps a row's height instead of collapsing — which is layout,
    // and so beyond what jsdom can tell us.
    it('keeps six rows in the first selectable month', () => {
      const utils = renderPicker();
      openPicker(utils);

      expect(rowFills(utils)).toHaveLength(SIX_FULL_WEEKS.length);
    });

    it('keeps six rows in the last selectable month', () => {
      const utils = renderPicker({ min: '2027-08-01', value: '2027-08-01' });
      openPicker(utils);

      expect(rowFills(utils)).toHaveLength(SIX_FULL_WEEKS.length);
    });

    // Filler days are real days: the ones past the maximum have to refuse the
    // click like any other out-of-range day. July 2027 trails into August,
    // where the 3rd is the last selectable date.
    it('disables filler days that fall past the maximum', () => {
      const utils = renderPicker({ min: '2027-07-01', value: '2027-07-01' });
      openPicker(utils);

      expect(utils.getByLabelText(/August 2nd, 2027/)).toBeEnabled();
      expect(utils.getByLabelText(/August 5th, 2027/)).toBeDisabled();
    });
  });

  // Nothing below is measurable in jsdom: every rect and every offsetHeight
  // reads zero. The placement maths is pure geometry, so the measurements are
  // fed in directly, with the popover's height derived from the rows it
  // actually rendered.
  describe('placement', () => {
    const VIEWPORT_HEIGHT = 768; // jsdom's window.innerHeight
    const FIELD_HEIGHT = 40;
    const ROW_HEIGHT = 30;
    // Padding, caption and weekday header — everything but the week rows.
    const POPOVER_CHROME = 60;
    const GAP = 6;

    const mockLayoutAtFieldTop = (fieldTop: number) => {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
        function (this: Element) {
          const isField = this.classList.contains('gh-portal-datepicker-field');
          const top = isField ? fieldTop : 0;
          const bottom = isField ? fieldTop + FIELD_HEIGHT : 0;
          return { top, bottom, left: 0, right: 300, width: 300, height: bottom - top } as DOMRect;
        },
      );
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
        function (this: HTMLElement) {
          if (this.classList.contains('gh-portal-datepicker-popover')) {
            // Every rendered row keeps its height even when react-day-picker
            // hides all of its out-of-bounds filler days.
            const rows = this.querySelectorAll('.gh-portal-datepicker-grid tbody tr');
            return POPOVER_CHROME + rows.length * ROW_HEIGHT;
          }
          return this.tagName === 'TR' ? ROW_HEIGHT : 0;
        },
      );
    };

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('flips above the field when the space below cannot hold it', () => {
      mockLayoutAtFieldTop(VIEWPORT_HEIGHT - FIELD_HEIGHT - 20);
      const utils = renderPicker();
      openPicker(utils);

      const popover = utils.getByTestId('datepicker-popover');
      // Pulled up its own height from the field's top edge, so the box's
      // bottom sits a gap above the field whatever the box measures.
      expect(popover.style.transform).toBe('translateY(-100%)');
      expect(popover.style.top).toBe(`${VIEWPORT_HEIGHT - FIELD_HEIGHT - 20 - GAP}px`);
    });

    it('hangs below the field without a transform when there is room', () => {
      mockLayoutAtFieldTop(20);
      const utils = renderPicker();
      openPicker(utils);

      const popover = utils.getByTestId('datepicker-popover');
      expect(popover.style.transform).toBe('');
      expect(popover.style.top).toBe(`${20 + FIELD_HEIGHT + GAP}px`);
    });

    // The popover is placed once, from the height it had when it opened, so a
    // calendar that changed height on paging used to drag a flipped box with
    // it. Padding every month to the same height is what makes that safe.
    it('keeps its placement when the month changes', () => {
      mockLayoutAtFieldTop(VIEWPORT_HEIGHT - FIELD_HEIGHT - 20);
      const utils = renderPicker();
      openPicker(utils);

      const popover = utils.getByTestId('datepicker-popover');
      const placedAt = popover.style.top;

      fireEvent.click(utils.getByLabelText(/next month/i));

      expect(rowFills(utils)).toEqual(SIX_FULL_WEEKS);
      expect(popover.style.top).toBe(placedAt);
      expect(popover.style.transform).toBe('translateY(-100%)');
    });
  });

  it('marks the field as invalid when asked', () => {
    const utils = renderPicker({ hasError: true });

    expect(field(utils)).toHaveClass('error');
  });

  it('closes on Escape', () => {
    const utils = renderPicker();
    openPicker(utils);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(utils.queryByTestId('datepicker-popover')).not.toBeInTheDocument();
  });
});
