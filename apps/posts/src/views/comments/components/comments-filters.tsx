import React from 'react';
import {Filter, Filters} from '@tryghost/shade/patterns';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {useCommentFilterFields} from '../use-comment-filter-fields';
import {useMemberValueSource} from '@src/hooks/filter-sources/use-member-value-source';
import {usePostResourceValueSource} from '@src/hooks/filter-sources/use-post-resource-value-source';

interface CommentsFiltersProps {
    filters: Filter[];
    onFiltersChange: (filters: Filter[]) => void;
}

const CommentsFilters: React.FC<CommentsFiltersProps> = ({
    filters,
    onFiltersChange
}) => {
    const postValueSource = usePostResourceValueSource();
    const memberValueSource = useMemberValueSource();
    const filterFields = useCommentFilterFields({
        memberValueSource,
        postValueSource
    });

    const hasFilters = filters.length > 0;

    const className = cn(
        'flex flex-row',
        !hasFilters && '[grid-area:actions] pt-5 justify-start sm:justify-end sm:pt-0',
        hasFilters && 'col-start-1 col-end-4 row-start-3 pt-5'
    );

    return (
        <div className={className}>
            <Filters
                addButtonIcon={
                    hasFilters ? (
                        <LucideIcon.FunnelPlus />
                    ) : (
                        <LucideIcon.Funnel />
                    )
                }
                addButtonText={hasFilters ? 'Add filter' : 'Filter'}
                allowMultiple={false}
                className={`[&>button]:order-last ${
                    hasFilters ? '[&>button]:border-none' : 'w-auto'
                }`}
                clearButtonClassName='font-normal text-muted-foreground'
                clearButtonIcon={<LucideIcon.X />}
                clearButtonText='Clear'
                fields={filterFields}
                filters={filters}
                keyboardShortcut='f'
                popoverAlign={hasFilters ? 'start' : 'end'}
                showClearButton={hasFilters}
                showSearchInput={false}
                onChange={onFiltersChange}
            />
        </div>
    );
};

export default CommentsFilters;
