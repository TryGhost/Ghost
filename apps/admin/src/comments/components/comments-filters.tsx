import React from 'react';
import { type Filter, FilterBar, Filters } from '@tryghost/shade/patterns';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { useCommentFilterFields } from '@/comments/use-comment-filter-fields';
import { useMemberValueSource, usePostResourceValueSource } from '@/shared/filter-sources';

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

  const filterBarActions = (
    <FilterBar.Actions>
      <FilterBar.Action type="button" variant="ghost" onClick={() => onFiltersChange([])}>
        Clear
      </FilterBar.Action>
    </FilterBar.Actions>
  );

  return (
    <Filters
      addButton={<Filters.Trigger />}
      allowMultiple={false}
      className={cn('[&>button]:order-last', !hasFilters && 'w-auto')}
      clearButton={filterBarActions}
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
