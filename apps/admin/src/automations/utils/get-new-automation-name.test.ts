import { describe, expect, it } from 'vitest';
import { getNewAutomationName } from './get-new-automation-name';

describe('getNewAutomationName', () => {
  it('uses the base name when available', () => {
    expect(getNewAutomationName([])).toBe('New Automation');
    expect(getNewAutomationName([{ name: 'New Automation 2' }])).toBe('New Automation');
    expect(getNewAutomationName([{ name: 'new automation' }])).toBe('New Automation');
  });

  it('finds the first available suffix', () => {
    const names = ['New Automation 4', 'New Automation 2', 'New Automation'];
    const automations = names.map((name) => ({ name }));
    expect(getNewAutomationName(automations)).toBe('New Automation 3');
  });
});
