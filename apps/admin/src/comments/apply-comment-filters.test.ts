import { describe, expect, it } from 'vitest';
import { applyCommentFilters } from './apply-comment-filters';
import { createFilter, type Filter } from '@tryghost/shade/patterns';

function stripIds(filters: Filter[]) {
  return filters.map((filter) => ({
    field: filter.field,
    operator: filter.operator,
    values: filter.values,
  }));
}

describe('applyCommentFilters', () => {
  it('applies a calendar day as two created_at bounds in one pass', () => {
    const next = applyCommentFilters(
      [],
      [
        { field: 'created_at', value: '2026-02-08' },
        { field: 'reported', value: 'true' },
      ],
    );

    expect(stripIds(next)).toEqual([
      { field: 'created_at', operator: 'is-or-greater', values: ['2026-02-08'] },
      { field: 'created_at', operator: 'is-or-less', values: ['2026-02-08'] },
      { field: 'reported', operator: 'is', values: ['true'] },
    ]);
  });

  it('replaces existing created_at filters instead of stacking them', () => {
    const existing = [
      createFilter('created_at', 'is-or-greater', ['2026-01-01']),
      createFilter('created_at', 'is-or-less', ['2026-01-01']),
      createFilter('status', 'is', ['published']),
    ];

    expect(
      stripIds(applyCommentFilters(existing, [{ field: 'created_at', value: '2026-02-08' }])),
    ).toEqual([
      { field: 'status', operator: 'is', values: ['published'] },
      { field: 'created_at', operator: 'is-or-greater', values: ['2026-02-08'] },
      { field: 'created_at', operator: 'is-or-less', values: ['2026-02-08'] },
    ]);
  });
});
