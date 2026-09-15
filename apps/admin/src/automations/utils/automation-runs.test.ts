import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AutomationRunsResponseSchema,
  type AutomationRun,
} from '@tryghost/admin-x-framework/api/automations';
import { mapAutomationRuns } from './automation-runs';

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
    const rows = mapAutomationRuns([
      run,
      { ...run, id: 'two', member: { ...run.member!, name: ' ' } },
      { ...run, id: 'three', member: null },
    ]);
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
    const [row] = mapAutomationRuns([run]);
    expect(row.enteredAt).toBe(run.created_at);
    expect(row.enteredLabel).toBe('8 min ago');
    expect(row.enteredDescription).toContain('2026');
  });

  it.each([
    { status: 'in_progress', failed: false, label: 'In progress' },
    { status: 'completed', failed: false, label: 'Completed' },
    { status: 'exited_early', failed: false, label: 'Exited early' },
    { status: 'exited_early', failed: true, label: 'Exited early — Failed' },
    { status: 'unclassified', failed: false, label: 'Unclassified' },
  ] as const)('labels $status with failed=$failed', ({ status, failed, label }) => {
    expect(mapAutomationRuns([{ ...run, status, failed }])[0].statusLabel).toBe(label);
  });
});

describe('automation run response validation', () => {
  it('accepts empty history and separate runs for the same member', () => {
    expect(AutomationRunsResponseSchema.parse({ automation_runs: [] }).automation_runs).toEqual([]);
    expect(
      AutomationRunsResponseSchema.safeParse({ automation_runs: [run, { ...run, id: 'two' }] })
        .success,
    ).toBe(true);
  });

  it.each(['in_progress', 'completed', 'unclassified'] as const)(
    'rejects a failure flag on a %s run',
    (status) => {
      expect(
        AutomationRunsResponseSchema.safeParse({
          automation_runs: [{ ...run, status, failed: true }],
        }).success,
      ).toBe(false);
    },
  );

  it.each([
    { name: 'missing envelope', body: {} },
    { name: 'missing failure flag', body: { automation_runs: [{ ...run, failed: undefined }] } },
    { name: 'invalid failure flag', body: { automation_runs: [{ ...run, failed: 'true' }] } },
    { name: 'unknown status', body: { automation_runs: [{ ...run, status: 'future' }] } },
    { name: 'invalid timestamp', body: { automation_runs: [{ ...run, created_at: 'invalid' }] } },
    { name: 'missing member', body: { automation_runs: [{ ...run, member: undefined }] } },
    { name: 'duplicate run', body: { automation_runs: [run, run] } },
    {
      name: 'more than ten runs',
      body: { automation_runs: Array.from({ length: 11 }, (_, i) => ({ ...run, id: String(i) })) },
    },
  ])('rejects $name', ({ body }) => {
    expect(AutomationRunsResponseSchema.safeParse(body).success).toBe(false);
  });
});
