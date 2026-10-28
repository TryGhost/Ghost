import assert from 'assert/strict';
import { describe, it } from 'vitest';
import { Calendar } from '../../../../src/components/ui/calendar';
import { render } from '../../utils/test-utils';

describe('Calendar today', () => {
  it('marks today under its number rather than with a background', () => {
    const today = new Date();
    render(<Calendar mode="range" />);

    const button = document.querySelector<HTMLButtonElement>(
      `button[data-day="${today.toLocaleDateString()}"]`,
    )!;
    assert.equal(button.dataset.today, 'true');
    // No background of its own, which would read as a selected day
    assert.ok(!button.closest('td')!.className.includes('bg-accent'));
  });
});
