import React, {useMemo} from 'react';
import {
    Filter,
    FilterFieldConfig,
    Filters,
    LucideIcon,
    cn
} from '@tryghost/shade';
import {getMember} from '@tryghost/admin-x-framework/api/members';
import {getPost} from '@tryghost/admin-x-framework/api/posts';
import {useFilterOptions} from '../hooks/use-filter-options';
import {useSearchMembers} from '../hooks/use-search-members';
import {useSearchPosts} from '../hooks/use-search-posts';

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
    const posts = useFilterOptions({
        knownItems: knownPosts,
        useSearch: useSearchPosts,
        useGetById: getPost,
        searchFieldName: 'posts',
        filters,
        filterFieldName: 'post',
        toOption: post => ({
            value: post.id,
            label: post.title || '(Untitled)'
        })
    });

    const members = useFilterOptions({
        knownItems: knownMembers,
        useSearch: useSearchMembers,
        useGetById: getMember,
        searchFieldName: 'members',
        filters,
        filterFieldName: 'author',
        toOption: member => ({
            value: member.id,
            label: member.name || 'Unknown name',
            detail: member.email ?? '(Unknown email)'
        })
    });

    const filterFields: FilterFieldConfig[] = useMemo(
        () => [
            {
                key: 'author',
                label: 'Author',
                type: 'select',
                icon: <LucideIcon.User className="size-4" />,
                options: members.options,
                isLoading: members.options.length === 0 && members.isLoading,
                onSearchChange: members.onSearchChange,
                searchValue: members.searchValue,
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
                options: posts.options,
                isLoading: posts.options.length === 0 && posts.isLoading,
                onSearchChange: posts.onSearchChange,
                searchValue: posts.searchValue,
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
        [posts, members]
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
