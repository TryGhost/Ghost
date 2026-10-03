import { type Filter, createFilter } from '@tryghost/shade/patterns';

export type CommentFilterPatch = {
  field: string;
  value: string;
  operator?: string;
};

/**
 * Replaces existing filters for each patched field. A `created_at` patch
 * without an operator represents one calendar day and expands to two bounds.
 * Explicit operators allow callers to apply a wider date range in one pass.
 */
export function applyCommentFilters(filters: Filter[], patches: CommentFilterPatch[]): Filter[] {
  const fields = new Set(patches.map((patch) => patch.field));
  const remaining = filters.filter((filter) => !fields.has(filter.field));
  const added = patches.flatMap((patch) => {
    if (patch.field === 'created_at' && !patch.operator) {
      return [
        createFilter('created_at', 'is-or-greater', [patch.value]),
        createFilter('created_at', 'is-or-less', [patch.value]),
      ];
    }

    return [createFilter(patch.field, patch.operator ?? 'is', [patch.value])];
  });

  return [...remaining, ...added];
}
