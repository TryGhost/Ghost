import assert from 'assert/strict';
import { describe, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Calendar } from '../../../../src/components/ui/calendar';
import { render } from '../../utils/test-utils';

const monthSelects = () =>
  screen.getAllByRole('combobox', { name: 'Choose the Month' }) as HTMLSelectElement[];
const yearSelects = () =>
  screen.getAllByRole('combobox', { name: 'Choose the Year' }) as HTMLSelectElement[];

// Each displayed month as YYYY-MM, read from its caption dropdowns
const shownMonths = () => {
  const years = yearSelects();
  return monthSelects().map(
    (month, index) => `${years[index].value}-${String(Number(month.value) + 1).padStart(2, '0')}`,
  );
};

const renderTwoMonths = () =>
  render(
    <Calendar
      captionLayout="dropdown"
      defaultMonth={new Date(2026, 8, 1)}
      endMonth={new Date(2026, 9, 12)}
      mode="range"
      numberOfMonths={2}
      startMonth={new Date(2024, 0, 17)}
    />,
  );

describe('Calendar caption dropdowns', () => {
  it('keeps a month picked in the second slot in that slot', () => {
    renderTwoMonths();
    assert.deepEqual(shownMonths(), ['2026-09', '2026-10']);

    fireEvent.change(yearSelects()[1], { target: { value: '2025' } });

    assert.deepEqual(shownMonths(), ['2025-09', '2025-10']);
  });

  it('keeps every displayed month inside endMonth', () => {
    renderTwoMonths();

    fireEvent.change(yearSelects()[0], { target: { value: '2025' } });
    fireEvent.change(monthSelects()[0], { target: { value: '11' } });
    assert.deepEqual(shownMonths(), ['2025-12', '2026-01']);

    // October 2026 is the last month, so it can only be shown second
    fireEvent.change(yearSelects()[0], { target: { value: '2026' } });
    fireEvent.change(monthSelects()[0], { target: { value: '9' } });
    assert.deepEqual(shownMonths(), ['2026-09', '2026-10']);
  });

  it('disables choices that cannot be shown in that slot', () => {
    renderTwoMonths();

    const firstSlotOctober = monthSelects()[0].querySelector(
      'option[value="9"]',
    ) as HTMLOptionElement;
    assert.equal(firstSlotOctober.disabled, true, 'October 2026 can only be the second month');

    fireEvent.change(yearSelects()[1], { target: { value: '2024' } });
    const secondSlotJanuary = monthSelects()[1].querySelector(
      'option[value="0"]',
    ) as HTMLOptionElement;
    assert.equal(secondSlotJanuary.disabled, true, 'January 2024 can only be the first month');
  });

  it('moves a single month without bounds as before', () => {
    render(
      <Calendar
        captionLayout="dropdown-months"
        defaultMonth={new Date(2025, 2, 1)}
        mode="single"
      />,
    );

    fireEvent.change(monthSelects()[0], { target: { value: '7' } });

    assert.equal(monthSelects()[0].value, '7');
  });
});
