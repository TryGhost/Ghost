import React from 'react';
import {Filter, Filters} from '@tryghost/shade/patterns';
import {LucideIcon} from '@tryghost/shade/utils';
import {useCommentFilterFields} from '../use-comment-filter-fields';
import {useMemberValueSource} from '@src/hooks/filter-sources/use-member-value-source';
import {usePostResourceValueSource} from '@src/hooks/filter-sources/use-post-resource-value-source';

interface CommentsFiltersProps {
    filters: Filter[];
    siteTimezone: string;
    onFiltersChange: (filters: Filter[]) => void;
}

const CommentsFilters: React.FC<CommentsFiltersProps> = ({
    filters,
    siteTimezone,
    onFiltersChange
}) => {
    const postValueSource = usePostResourceValueSource();
    const memberValueSource = useMemberValueSource();
    const filterFields = useCommentFilterFields({
        memberValueSource,
        postValueSource,
        siteTimezone
    });

    const hasFilters = filters.length > 0;

    return (
        <Filters
            addButtonIcon={hasFilters ? <LucideIcon.FunnelPlus /> : <LucideIcon.Funnel />}
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
    );
};

export default CommentsFilters;
