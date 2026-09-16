import {
  AutomationRunsResponseSchema,
  AutomationStatusStatsResponseSchema,
  matchesAutomationSearch,
  mergeAutomationSearchBuckets,
} from '../../../src/api/automations';

const search = { version: 1, query: 'Anna', matching: 'contains' };
const totals = {
  automation_id: 'a',
  in_progress_run_count: 0,
  completed_run_count: 60,
  exited_early_run_count: 0,
  unclassified_run_count: 2,
};
describe('Automation search response contracts', () => {
  it('requires matching metadata before treating a response as searched', () => {
    expect(matchesAutomationSearch(undefined, 'Anna')).toBe(false);
    for (const other of [
      { ...search, version: 2 },
      { ...search, query: 'anna' },
      { ...search, matching: 'prefix' },
    ]) {
      expect(matchesAutomationSearch({ search: other }, 'Anna')).toBe(false);
    }
    expect(matchesAutomationSearch({ search }, 'Anna')).toBe(true);
  });
  it('accepts pending counts and exact completed totals while preserving old Core responses', () => {
    expect(
      AutomationStatusStatsResponseSchema.safeParse({
        automation_status_stats: [],
        meta: { search, pagination: { state: 'scanning', next_cursor: 'signed' } },
      }).success,
    ).toBe(true);
    expect(
      AutomationStatusStatsResponseSchema.safeParse({
        automation_status_stats: [totals],
        meta: { search, pagination: { state: 'exhausted', next_cursor: null } },
      }).success,
    ).toBe(true);
    expect(
      AutomationStatusStatsResponseSchema.safeParse({ automation_status_stats: [totals] }).success,
    ).toBe(true);
  });
  it.each([
    { automation_status_stats: [] },
    {
      automation_status_stats: [totals],
      meta: { search, pagination: { state: 'scanning', next_cursor: 'token' } },
    },
    {
      automation_status_stats: [],
      meta: { search, pagination: { state: 'exhausted', next_cursor: null } },
    },
    {
      automation_status_stats: [],
      meta: { search, pagination: { state: 'scanning', next_cursor: null } },
    },
  ])('rejects partial or malformed counts instead of presenting success', (body) => {
    expect(AutomationStatusStatsResponseSchema.safeParse(body).success).toBe(false);
  });
  it.each([
    { state: 'scanning', next_cursor: null },
    { state: 'more', next_cursor: null },
    { state: 'exhausted', next_cursor: 'token' },
    { next_cursor: 'token' },
  ])(
    'rejects searched list progress without a valid exhaustion/continuation state',
    (pagination) => {
      expect(
        AutomationRunsResponseSchema.safeParse({
          automation_runs: [],
          meta: { search, pagination: { limit: 50, ...pagination } },
        }).success,
      ).toBe(false);
    },
  );
});

describe('Search chart accumulation', () => {
  const response = (entries: { date: string; count: number }[], done = false) =>
    AutomationStatusStatsResponseSchema.parse({
      automation_status_stats: done ? [totals] : [],
      meta: {
        search,
        entry_buckets: { version: 1, timezone: 'America/New_York', entries },
        pagination: { state: done ? 'exhausted' : 'scanning', next_cursor: done ? null : 'next' },
      },
    });
  const params = { timezone: 'America/New_York' };
  it('merges repeated dates across pages only after exhaustion and reconciles with the complete counts', () => {
    const first = response([{ date: '2026-09-01', count: 50 }]);
    const last = response(
      [
        { date: '2026-09-01', count: 10 },
        { date: '2026-09-02', count: 2 },
      ],
      true,
    );
    expect(mergeAutomationSearchBuckets([first], 'Anna', params)).toBeUndefined();
    const merged = mergeAutomationSearchBuckets([first, last], 'Anna', params);
    expect(merged?.entries).toEqual([
      { date: '2026-09-01', count: 60 },
      { date: '2026-09-02', count: 2 },
    ]);
    expect(mergeAutomationSearchBuckets([first, last], 'Anna', params)).toEqual(merged);
    expect(mergeAutomationSearchBuckets([last], 'Anna', params)).toBeUndefined();
    expect(mergeAutomationSearchBuckets([first, last], 'Bert', params)).toBeUndefined();
    expect(
      mergeAutomationSearchBuckets([first, last], 'Anna', { timezone: 'UTC' }),
    ).toBeUndefined();
  });
  it('requires every page to acknowledge chart support', () => {
    const old = response([]);
    delete old.meta!.entry_buckets;
    expect(
      mergeAutomationSearchBuckets(
        [old, response([{ date: '2026-09-01', count: 62 }], true)],
        'Anna',
        params,
      ),
    ).toBeUndefined();
  });
});
