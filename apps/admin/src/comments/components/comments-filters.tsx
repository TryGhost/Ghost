import React from 'react';
import { Button } from '@tryghost/shade/components';
import { type Filter, Filters } from '@tryghost/shade/patterns';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { useCommentFilterFields } from '@/comments/use-comment-filter-fields';
import { useMemberValueSource, usePostResourceValueSource } from '@/shared/filter-sources';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

interface CommentsFiltersProps {
  filters: Filter[];
  siteTimezone: string;
  onFiltersChange: (filters: Filter[]) => void;
}

const CommentsFilters: React.FC<CommentsFiltersProps> = ({
  filters,
  siteTimezone,
  onFiltersChange,
}) => {
  const postValueSource = usePostResourceValueSource();
  const memberValueSource = useMemberValueSource();
  const filterFields = useCommentFilterFields({
    memberValueSource,
    postValueSource,
    siteTimezone,
  });

  const hasFilters = filters.length > 0;
  const useConsolidatedFilterUI = useFeatureFlag('postsListReact');

  const outlinedClearButton = useConsolidatedFilterUI ? (
    <Button
      className="sm:absolute sm:top-0 sm:right-0"
      type="button"
      variant="outline"
      onClick={() => onFiltersChange([])}
    >
      <LucideIcon.X />
      Clear
    </Button>
  ) : undefined;

  return (
    <Filters
      addButtonClassName={hasFilters ? 'border-none' : undefined}
      addButtonIcon={
        useConsolidatedFilterUI ? (
          hasFilters ? (
            <LucideIcon.ListFilterPlus />
          ) : (
            <LucideIcon.ListFilter />
          )
        ) : hasFilters ? (
          <LucideIcon.FunnelPlus />
        ) : (
          <LucideIcon.Funnel />
        )
      }
      addButtonText={hasFilters ? 'Add filter' : 'Filter'}
      allowMultiple={false}
      className={cn('[&>button]:order-last', !hasFilters && 'w-auto')}
      clearButton={outlinedClearButton}
      clearButtonClassName="font-normal text-muted-foreground"
      clearButtonIcon={<LucideIcon.X />}
      clearButtonText="Clear"
      fields={filterFields}
      filters={filters}
      keyboardShortcut="f"
      popoverAlign={hasFilters ? 'start' : 'end'}
      showClearButton={hasFilters}
      showSearchInput={false}
      onChange={onFiltersChange}
    />
  );
};

export default CommentsFilters;
