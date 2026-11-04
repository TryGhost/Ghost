import { describe, expect, it } from 'vitest';
import { Calendar } from '../../../../src/components/ui/calendar';
import { render } from '../../utils/test-utils';

// A fixed today keeps the tests independent of the clock: Tuesday 14 Oct 2025
const today = new Date(2025, 9, 14);
const sunday = new Date(2025, 9, 12);

const dayButton = (date: Date) =>
  document.querySelector<HTMLButtonElement>(`button[data-day="${date.toLocaleDateString()}"]`)!;

describe('Calendar today', () => {
  it('marks today under its number rather than with a background', () => {
    render(<Calendar defaultMonth={today} mode="range" today={today} />);

    const button = dayButton(today);
    expect(button.dataset.today).toBe('true');
    // No background of its own, which would read as a selected day
    expect(button.closest('td')!.className).not.toContain('bg-accent');
  });
});

describe('Calendar week edges', () => {
  it('keeps a day picked on a Sunday its full shape', () => {
    render(<Calendar defaultMonth={today} mode="single" selected={sunday} today={today} />);

    const cell = dayButton(sunday).closest('td')!;
    expect(cell.dataset.selected).toBe('true');
    // The rounding where a week starts or ends is only for a range's band
    const edgeRules = cell.className
      .split(' ')
      .filter((name) => name.includes('first-child') || name.includes('last-child'));
    expect(edgeRules.length > 0).toBeTruthy();
    for (const rule of edgeRules) {
      expect(rule, rule).toContain('data-range-middle=true');
    }
  });
});
