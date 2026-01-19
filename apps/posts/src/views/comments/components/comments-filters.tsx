import React, {useCallback, useMemo} from 'react';
import {
    Button,
    Filter,
    FilterFieldConfig,
    Filters,
    LucideIcon,
    cn
} from '@tryghost/shade';
import {useFilterOptions} from '../hooks/use-filter-options';
import {useSearchMembers} from '../hooks/use-search-members';
import {useSearchPosts} from '../hooks/use-search-posts';

interface CommentsFiltersProps {
    filters: Filter[];
    onFiltersChange: (filters: Filter[]) => void;
    knownPosts: Array<{ id: string; title: string }>;
    knownMembers: Array<{ id: string; name: string; email: string }>;
    knownThreads: Array<{ id: string; snippet: string }>;
    knownReplyTos: Array<{ id: string; snippet: string }>;
}

const CommentsFilters: React.FC<CommentsFiltersProps> = ({
    knownPosts,
    knownMembers,
    knownThreads,
    knownReplyTos,
    filters,
    onFiltersChange
}) => {
    const posts = useFilterOptions({
        knownItems: knownPosts,
        useSearch: useSearchPosts,
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
                className: 'w-80',
                popoverContentClassName: 'w-80',
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
                className: 'w-48',
                popoverContentClassName: 'w-48'
            },
            {
                key: 'status',
                label: 'Status',
                type: 'select',
                icon: <LucideIcon.Circle className="size-4" />,
                options: [
                    {value: 'published', label: 'Published'},
                    {value: 'hidden', label: 'Hidden'}
                ]
            },
            {
                key: 'reported',
                label: 'Reported',
                type: 'select',
                icon: <LucideIcon.Flag className="size-4" />,
                options: [
                    {value: 'true', label: 'Yes'},
                    {value: 'false', label: 'No'}
                ]
            },
            {
                key: 'created_at',
                label: 'Date',
                type: 'date',
                className: 'w-32',
                icon: <LucideIcon.Calendar className="size-4" />,
                operators: [
                    {value: 'is', label: 'is'},
                    {value: 'before', label: 'before'},
                    {value: 'after', label: 'after'}
                ]
            },
            {
                key: 'thread',
                label: 'Thread',
                type: 'select',
                icon: <LucideIcon.MessageSquare className="size-4" />,
                // Map known thread parent IDs to their snippets for display
                options: knownThreads.map(t => ({
                    value: t.id,
                    label: t.snippet
                })),
                hideOperatorSelect: true
            },
            {
                key: 'reply_to',
                label: 'Reply to',
                type: 'select',
                icon: <LucideIcon.Reply className="size-4" />,
                // Map known reply-to IDs to their snippets for display
                options: knownReplyTos.map(r => ({
                    value: r.id,
                    label: r.snippet
                })),
                hideOperatorSelect: true
            }
        ],
        [posts, members, knownThreads, knownReplyTos]
    );

    // Check if there are active thread/reply_to filters
    const hasThreadFilter = filters.some(f => f.field === 'thread');
    const hasReplyToFilter = filters.some(f => f.field === 'reply_to');

    // Only include thread/reply_to fields when there's an active filter
    // This hides them from the add menu but allows them to render when active
    const visibleFields = useMemo(
        () => {
            return filterFields.filter((f) => {
                if (f.key === 'thread') {
                    return hasThreadFilter;
                }
                if (f.key === 'reply_to') {
                    return hasReplyToFilter;
                }
                return true;
            });
        },
        [filterFields, hasThreadFilter, hasReplyToFilter]
    );

    const hasFilters = filters.length > 0;

    const handleClearFilters = useCallback(() => {
        onFiltersChange([]);
    }, [onFiltersChange]);

    const className = cn(
        'flex flex-row justify-between',
        !hasFilters && '[grid-area:actions] ',
        hasFilters && 'col-start-1 col-end-4 row-start-3 pt-7 '
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
                className={`[&>button]:order-last ${
                    hasFilters && '[&>button]:border-none'
                }`}
                fields={visibleFields}
                filters={filters}
                keyboardShortcut="f"
                popoverAlign={hasFilters ? 'start' : 'end'}
                onChange={onFiltersChange}
            />
            {hasFilters && (
                <Button
                    className="font-normal text-muted-foreground"
                    variant="ghost"
                    onClick={handleClearFilters}
                >
                    <LucideIcon.FunnelX />
                    Clear
                </Button>
            )}
        </div>
    );
};

export default CommentsFilters;
