import { useMemo } from 'react';
import {
  DATE_OPERATOR_LABELS,
  FIELD_ICONS,
  RELATIVE_DATE_OPERATOR_LABELS,
  createOperatorOptions,
  createRelativeDateRenderer,
  fieldHasRelativeOperator,
  getTodayInTimezone,
} from '@/shared/filters';
import type { FieldIcon } from '@/shared/filters';
import type { FilterFieldConfig, ValueSource } from '@tryghost/shade/patterns';
import { COMMENT_FIELD_CATALOG } from './comment-filter-catalog';

interface UseCommentFilterFieldsOptions {
  postValueSource: ValueSource<string>;
  memberValueSource: ValueSource<string>;
  siteTimezone?: string;
}

const COMMENT_FIELD_ORDER = ['author', 'post', 'body', 'status', 'reported', 'created_at'] as const;

const COMMENT_OPERATOR_LABELS = {
  ...DATE_OPERATOR_LABELS,
  ...RELATIVE_DATE_OPERATOR_LABELS,
};

export function useCommentFilterFields({
  postValueSource,
  memberValueSource,
  siteTimezone = 'UTC',
}: UseCommentFilterFieldsOptions): FilterFieldConfig[] {
  return useMemo(() => {
    const today = getTodayInTimezone(siteTimezone);

    return COMMENT_FIELD_ORDER.map((key) => {
      const field = COMMENT_FIELD_CATALOG[key];
      const dateConfig =
        key === 'created_at'
          ? {
              defaultValue: today,
              ...(fieldHasRelativeOperator(field)
                ? { customRenderer: createRelativeDateRenderer(today) }
                : {}),
            }
          : {};

      return {
        key,
        ...field.ui,
        icon: FIELD_ICONS[field.ui.icon as FieldIcon],
        operators: createOperatorOptions(field.operators, { labels: COMMENT_OPERATOR_LABELS }),
        ...('options' in field && field.options ? { options: field.options } : {}),
        ...dateConfig,
        ...(key === 'author' ? { valueSource: memberValueSource } : {}),
        ...(key === 'post' ? { valueSource: postValueSource } : {}),
      };
    });
  }, [memberValueSource, postValueSource, siteTimezone]);
}
