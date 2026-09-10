import React from 'react';
import { type Filter, FilterBar, Filters } from '@tryghost/shade/patterns';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { useCommentFilterFields } from '@/comments/use-comment-filter-fields';
import { useMemberValueSource, usePostResourceValueSource } from '@/shared/filter-sources';
import { useAdmin7Pill } from '@/layout/use-admin7-pill';

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
  const { enabled: isAdmin7Pill } = useAdmin7Pill();
  const postValueSource = usePostResourceValueSource();
  const memberValueSource = useMemberValueSource();
  const filterFields = useCommentFilterFields({
    memberValueSource,
    postValueSource,
    siteTimezone,
  });

  const hasFilters = filters.length > 0;

  const filterBarActions = isAdmin7Pill ? (
    <FilterBar.Actions>
      <FilterBar.Action type="button" variant="ghost" onClick={() => onFiltersChange([])}>
        Clear
      </FilterBar.Action>
    </FilterBar.Actions>
  ) : undefined;

  return (
    <Filters
      addButtonClassName={cn(hasFilters && !isAdmin7Pill && 'border-none')}
      addButtonIcon={
        isAdmin7Pill ? (
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
      addButtonVariant={isAdmin7Pill && !hasFilters ? 'ghost' : undefined}
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
