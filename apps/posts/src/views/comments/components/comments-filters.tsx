import React from 'react';
import {
    Filter,
    Filters,
    LucideIcon,
    cn
} from '@tryghost/shade';
import {useCommentFilterFields} from '../use-comment-filter-fields';

interface CommentsFiltersProps {
    filters: Filter[];
    onFiltersChange: (filters: Filter[]) => void;
    knownPosts: Array<{ id: string; title: string }>;
    knownMembers: Array<{ id: string; name?: string; email?: string }>;
}

const CommentsFilters: React.FC<CommentsFiltersProps> = ({
    knownPosts,
    knownMembers,
    filters,
    onFiltersChange
}) => {
    const filterFields = useCommentFilterFields({
        filters,
        knownPosts,
        knownMembers
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
