import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AutomationRun } from '@tryghost/admin-x-framework/api/automations';
import { mapAutomationRun } from './automation-runs';

const run: AutomationRun = {
  id: 'one',
  created_at: '2026-09-15T12:00:00.000Z',
  status: 'completed',
  failed: false,
  member: { id: 'member', name: ' Alex ', email: 'alex@example.com' },
};

describe('automation run list mapping', () => {
  afterEach(() => vi.useRealTimers());

  it('preserves run identity and order while mapping name and email fallbacks', () => {
    const rows = [
      run,
      { ...run, id: 'two', member: { ...run.member!, name: ' ' } },
      { ...run, id: 'three', member: null },
    ].map(mapAutomationRun);
    expect(
      rows.map(({ id, memberName, memberEmail }) => ({ id, memberName, memberEmail })),
    ).toEqual([
      { id: 'one', memberName: 'Alex', memberEmail: 'alex@example.com' },
      { id: 'two', memberName: 'alex@example.com', memberEmail: undefined },
      { id: 'three', memberName: 'Deleted member', memberEmail: undefined },
    ]);
  });

  it('keeps the entry timestamp and formats a relative label and full description', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-15T12:08:00Z'));
    const row = mapAutomationRun(run);
    expect(row.enteredAt).toBe(run.created_at);
    expect(row.enteredLabel).toBe('8 min ago');
    expect(row.enteredDescription).toContain('2026');
  });

  it.each([
    { status: 'in_progress', failed: false, label: 'In progress' },
    { status: 'completed', failed: false, label: 'Completed' },
    { status: 'exited_early', failed: false, label: 'Exited early' },
    { status: 'exited_early', failed: true, label: 'Exited early — Failed' },
  ] as const)('labels $status with failed=$failed', ({ status, failed, label }) => {
    expect(mapAutomationRun({ ...run, status, failed }).statusLabel).toBe(label);
  });
});
