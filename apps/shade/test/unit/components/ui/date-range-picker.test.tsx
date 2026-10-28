import assert from 'assert/strict';
import { beforeAll, describe, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import {
  DateRangePicker,
  DateRangePickerContent,
  type DateRangePickerPreset,
  DateRangePickerTrigger,
} from '../../../../src/components/ui/date-range-picker';
import { render } from '../../utils/test-utils';

const presets: DateRangePickerPreset[] = [
  {
    id: '7',
    label: 'Last 7 days',
    shortcut: 'w',
    range: { from: new Date(2026, 9, 6), to: new Date(2026, 9, 12) },
  },
];

const renderPicker = (props: { minDays?: number } = {}) => {
  const onPresetSelect = vi.fn();
  const onRangeSelect = vi.fn();
  render(
    <DateRangePicker defaultOpen>
      <DateRangePickerTrigger>Date range</DateRangePickerTrigger>
      <DateRangePickerContent
        aria-label="Pick dates"
        maxDate={new Date(2026, 9, 12)}
        minDate={new Date(2026, 8, 1)}
        presets={presets}
        onPresetSelect={onPresetSelect}
        onRangeSelect={onRangeSelect}
        {...props}
      />
    </DateRangePicker>,
  );
  return { onPresetSelect, onRangeSelect };
};

const day = (date: Date) =>
  document.querySelector<HTMLButtonElement>(`button[data-day="${date.toLocaleDateString()}"]`)!;
const picker = () => screen.queryByRole('dialog', { name: 'Pick dates' });

describe('DateRangePicker', () => {
  beforeAll(() => {
    // jsdom does not implement matchMedia, which useIsMobile relies on
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  it('applies a preset in one click and closes', () => {
    const { onPresetSelect } = renderPicker();

    fireEvent.click(screen.getByRole('option', { name: 'Last 7 days' }));

    assert.equal(onPresetSelect.mock.calls[0][0].id, '7');
    assert.equal(picker(), null);
  });

  it('shows a preset’s key without making it part of its name', () => {
    renderPicker();

    const option = screen.getByRole('option', { name: 'Last 7 days' });
    assert.equal(option.getAttribute('aria-keyshortcuts'), 'w');
  });

  it('applies a range on its second click and closes', () => {
    const { onRangeSelect } = renderPicker();

    fireEvent.click(day(new Date(2026, 9, 2)));
    assert.equal(onRangeSelect.mock.calls.length, 0);
    assert.notEqual(picker(), null);

    fireEvent.click(day(new Date(2026, 9, 8)));

    const [range] = onRangeSelect.mock.calls[0];
    assert.equal(range.from.getDate(), 2);
    assert.equal(range.to.getDate(), 8);
    assert.equal(picker(), null);
  });

  it('picks a single day when it is clicked twice', () => {
    const { onRangeSelect } = renderPicker();

    fireEvent.click(day(new Date(2026, 9, 5)));
    fireEvent.click(day(new Date(2026, 9, 5)));

    const [range] = onRangeSelect.mock.calls[0];
    assert.equal(range.from.getDate(), 5);
    assert.equal(range.to.getDate(), 5);
  });

  it('won’t pick fewer days than minDays', () => {
    const { onRangeSelect } = renderPicker({ minDays: 2 });

    fireEvent.click(day(new Date(2026, 9, 5)));
    fireEvent.click(day(new Date(2026, 9, 5)));

    assert.equal(onRangeSelect.mock.calls.length, 0);
    assert.notEqual(picker(), null);
  });
});
