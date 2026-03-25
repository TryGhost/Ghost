import React, {useMemo} from 'react';
import {
    Filter,
    FilterFieldConfig,
    Filters,
    LucideIcon,
    cn
} from '@tryghost/shade';
import {escapeNqlString} from '../../filters/filter-normalization';
import {getActiveFilterValues, useFilterSearch} from '@src/hooks/use-filter-search';
import {getMember} from '@tryghost/admin-x-framework/api/members';
import {getPost} from '@tryghost/admin-x-framework/api/posts';
import {useBrowseMembersInfinite} from '@tryghost/admin-x-framework/api/members';
import {useBrowsePostsInfinite} from '@tryghost/admin-x-framework/api/posts';

interface CommentsFiltersProps {
    filters: Filter[];
    onFiltersChange: (filters: Filter[]) => void;
}

const CommentsFilters: React.FC<CommentsFiltersProps> = ({
    filters,
    onFiltersChange
}) => {
    const activeAuthorValues = getActiveFilterValues(filters, 'author');
    const activePostValues = getActiveFilterValues(filters, 'post');

    const memberSearch = useFilterSearch({
        useQuery: useBrowseMembersInfinite,
        dataKey: 'members',
        serverSearchParams: (term): Record<string, string> => (term ? {search: term} : {}),
        localSearchFilter: (members, term) => members.filter(m => (m.name || '').toLowerCase().includes(term.toLowerCase()) ||
                (m.email || '').toLowerCase().includes(term.toLowerCase())
        ),
        toOption: m => ({
            value: m.id,
            label: m.name || 'Unknown name',
            detail: m.email ?? '(Unknown email)'
        }),
        useGetById: getMember,
        activeValues: activeAuthorValues
    });

    const postSearch = useFilterSearch({
        useQuery: useBrowsePostsInfinite,
        dataKey: 'posts',
        serverSearchParams: (term): Record<string, string> => (term ? {filter: `title:~${escapeNqlString(term)}`} : {}),
        localSearchFilter: (posts, term) => posts.filter(p => (p.title || '').toLowerCase().includes(term.toLowerCase())),
        toOption: p => ({
            value: p.id,
            label: p.title || '(Untitled)'
        }),
        useGetById: getPost,
        activeValues: activePostValues
    });

    const filterFields: FilterFieldConfig[] = useMemo(
        () => [
            {
                key: 'author',
                label: 'Author',
                type: 'select',
                icon: <LucideIcon.User className="size-4" />,
                options: memberSearch.options,
                isLoading: memberSearch.options.length === 0 && memberSearch.isLoading,
                onSearchChange: memberSearch.onSearchChange,
                searchValue: memberSearch.searchValue,
                searchable: true,
                className: 'w-80',
                popoverContentClassName: 'w-80',
                operators: [
                    {value: 'is', label: 'is'},
                    {value: 'is_not', label: 'is not'}
                ]
            },
            {
                key: 'post',
                label: 'Post',
                type: 'select',
                icon: <LucideIcon.FileText className="size-4" />,
                options: postSearch.options,
                isLoading: postSearch.options.length === 0 && postSearch.isLoading,
                onSearchChange: postSearch.onSearchChange,
                searchValue: postSearch.searchValue,
                searchable: true,
                className: 'w-full max-w-80',
                popoverContentClassName: 'w-full max-w-[calc(100vw-32px)] max-w-80',
                operators: [
                    {value: 'is', label: 'is'},
                    {value: 'is_not', label: 'is not'}
                ]
            },
            {
                key: 'body',
                label: 'Text',
                type: 'text',
                icon: <LucideIcon.MessageSquareText className="size-4" />,
                placeholder: 'Search comment text...',
                operators: [
                    {value: 'contains', label: 'contains'},
                    {value: 'not_contains', label: 'does not contain'}
                ],
                defaultOperator: 'contains',
                className: 'w-full max-w-48',
                popoverContentClassName: 'w-full max-w-48'
            },
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                icon: <LucideIcon.Circle className="size-4" />,
                options: [
                    {value: 'published', label: 'Published'},
                    {value: 'hidden', label: 'Hidden'}
                ],
                operators: [
                    {value: 'is', label: 'is'}
                ],
                searchable: false,
                hideOperatorSelect: true
            },
            {
                key: 'reported',
                label: 'Reported',
                type: 'select',
                icon: <LucideIcon.Flag className="size-4" />,
                options: [
                    {value: 'true', label: 'Yes'},
                    {value: 'false', label: 'No'}
                ],
                operators: [
                    {value: 'is', label: 'is'}
                ],
                searchable: false,
                hideOperatorSelect: true
            },
            {
                key: 'created_at',
                label: 'Date',
                type: 'date',
                className: 'w-full max-w-32',
                icon: <LucideIcon.Calendar className="size-4" />,
                operators: [
                    {value: 'is', label: 'is'},
                    {value: 'before', label: 'before'},
                    {value: 'after', label: 'after'}
                ]
            }
        ],
        [memberSearch, postSearch]
    );

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
