import React, {useCallback, useMemo, useState} from 'react';
import {Button, Filter, FilterFieldConfig, Filters, Header, LucideIcon, cn} from '@tryghost/shade';
import {useSearchMembers} from '@hooks/use-search-members';
import {useSearchPosts} from '@hooks/use-search-posts';

interface CommentsHeaderProps {
    filters: Filter[];
    onFiltersChange: (filters: Filter[]) => void;
}

const CommentsHeader: React.FC<CommentsHeaderProps> = ({filters, onFiltersChange}) => {
    const [postSearch, setPostSearch] = useState('');
    const [memberSearch, setMemberSearch] = useState('');

    const {data: postsData, isLoading: postsLoading} = useSearchPosts(postSearch);
    const {data: membersData, isLoading: membersLoading} = useSearchMembers(memberSearch);

    const postOptions = useMemo(() => {
        const options = postsData?.posts?.map(post => ({
            value: post.id,
            label: post.title || '(Untitled)'
        })) || [];

        // If there's an active post filter and the value isn't in the options, add it
        const postFilter = filters.find(f => f.field === 'post');
        if (postFilter && postFilter.values[0]) {
            const filterValue = postFilter.values[0] as string;
            const existsInOptions = options.some(opt => opt.value === filterValue);
            if (!existsInOptions) {
                options.unshift({
                    value: filterValue,
                    label: `ID: ${filterValue}`
                });
            }
        }

        return options;
    }, [postsData, filters]);

    const memberOptions = useMemo(() => {
        const options = membersData?.members?.map(member => ({
            value: member.id,
            label: member.name || 'Unknown name',
            detail: member.email ?? '(Unknown email)'
        })) || [];

        // If there's an active author filter and the value isn't in the options, add it
        const authorFilter = filters.find(f => f.field === 'author');
        if (authorFilter && authorFilter.values[0]) {
            const filterValue = authorFilter.values[0] as string;
            const existsInOptions = options.some(opt => opt.value === filterValue);
            if (!existsInOptions) {
                options.unshift({
                    value: filterValue,
                    label: `ID: ${filterValue}`,
                    detail: ''
                });
            }
        }

        return options;
    }, [membersData, filters]);

    const filterFields: FilterFieldConfig[] = useMemo(() => [
        {
            key: 'author',
            label: 'Author',
            type: 'select',
            icon: <LucideIcon.User className="size-4" />,
            options: memberOptions,
            isLoading: membersLoading,
            onSearchChange: setMemberSearch,
            searchValue: memberSearch,
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
            options: postOptions,
            isLoading: postsLoading,
            onSearchChange: setPostSearch,
            searchValue: postSearch,
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
        }
    ], [postOptions, postsLoading, postSearch, memberOptions, membersLoading, memberSearch]);

    const hasFilters = filters.length > 0;

    const handleClearFilters = useCallback(() => {
        onFiltersChange([]);
    }, [onFiltersChange]);

    const className = cn('flex flex-row justify-between',
        !hasFilters && '[grid-area:actions] ',
        hasFilters && 'col-start-1 col-end-4 row-start-3 pt-7 ');

    return (
        <Header className='!pb-6' variant="inline-nav">
            <Header.Title>Comments</Header.Title>
            <div className={className}>
                <Filters
                    addButtonIcon={hasFilters ? <LucideIcon.FunnelPlus /> : <LucideIcon.Funnel />}
                    addButtonText={hasFilters ? 'Add filter' : 'Filter'}
                    className={`[&>button]:order-last ${hasFilters && '[&>button]:border-none'}`}
                    fields={filterFields}
                    filters={filters}
                    keyboardShortcut="f"
                    popoverAlign={hasFilters ? 'start' : 'end'}
                    onChange={onFiltersChange}
                />
                {hasFilters && (
                    <Button
                        className='font-normal text-muted-foreground'
                        variant="ghost"
                        onClick={handleClearFilters}
                    >
                        <LucideIcon.FunnelX />
                        Clear
                    </Button>
                )}

            </div>
        </Header>
    );
};

export default CommentsHeader;

