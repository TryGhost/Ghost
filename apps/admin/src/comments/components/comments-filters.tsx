import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { Button } from '@tryghost/shade/components';
import React from 'react';
import { type Filter, FilterBar, Filters, PageHeader } from '@tryghost/shade/patterns';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { useCommentFilterFields } from '@/comments/use-comment-filter-fields';
import { useMemberValueSource, usePostResourceValueSource } from '@/shared/filter-sources';
import { useShade } from '@tryghost/shade/app';

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
  const { isLegacyDesign } = useShade();
  const useConsolidatedFilterUI = useFeatureFlag('postsListReact');
  const postValueSource = usePostResourceValueSource();
  const memberValueSource = useMemberValueSource();
  const filterFields = useCommentFilterFields({
    memberValueSource,
    postValueSource,
    siteTimezone,
  });

  const hasFilters = filters.length > 0;

  const filterBarActions = !isLegacyDesign ? (
    <FilterBar.Actions>
      <FilterBar.Action type="button" variant="ghost" onClick={() => onFiltersChange([])}>
        Clear
      </FilterBar.Action>
    </FilterBar.Actions>
  ) : useConsolidatedFilterUI ? (
    <Button
      className="sm:absolute sm:top-0 sm:right-0"
      type="button"
      variant="outline"
      onClick={() => onFiltersChange([])}
    >
      Clear
    </Button>
  ) : undefined;

  return (
    <Filters
      addButton={!hasFilters && !isLegacyDesign ? <PageHeader.FilterTrigger /> : undefined}
      addButtonClassName={cn(
        hasFilters &&
          isLegacyDesign &&
          (useConsolidatedFilterUI ? 'gap-0 !px-3 text-[0px]' : 'border-none'),
      )}
      addButtonIcon={
        !isLegacyDesign || useConsolidatedFilterUI ? (
          hasFilters ? (
            <LucideIcon.ListFilterPlus className={!isLegacyDesign ? 'stroke-2!' : undefined} />
          ) : (
            <LucideIcon.ListFilter className={!isLegacyDesign ? 'stroke-2!' : undefined} />
          )
        ) : hasFilters ? (
          <LucideIcon.FunnelPlus />
        ) : (
          <LucideIcon.Funnel />
        )
      }
      addButtonText={hasFilters ? 'Add filter' : 'Filter'}
      addButtonVariant={!isLegacyDesign && !hasFilters ? 'ghost' : undefined}
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
