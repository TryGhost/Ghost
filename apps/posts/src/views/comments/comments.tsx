import CommentsContent from './components/comments-content';
import CommentsHeader from './components/comments-header';
import CommentsLayout from './components/comments-layout';
import CommentsList from './components/comments-list';
import React, {useCallback, useMemo, useState} from 'react';
import {Button, EmptyIndicator, LoadingIndicator, LucideIcon, createFilter} from '@tryghost/shade';
import {useBrowseComments} from '@tryghost/admin-x-framework/api/comments';
import type {Filter} from '@tryghost/shade';

function buildCommentsFilter(filters: Filter[]): string | undefined {
    const parts: string[] = [];
    
    for (const filter of filters) {
        switch (filter.field) {
        case 'status':
            if (filter.values[0]) {
                parts.push(`status:${filter.values[0]}`);
            }
            break;
        case 'created_at':
            if (filter.operator === 'before' && filter.values[0]) {
                parts.push(`created_at:<'${filter.values[0]}'`);
            } else if (filter.operator === 'after' && filter.values[0]) {
                parts.push(`created_at:>'${filter.values[0]}'`);
            } else if (filter.operator === 'is' && filter.values[0]) {
                parts.push(`created_at:'${filter.values[0]}'`);
            } else if (filter.operator === 'between' && filter.values[0] && filter.values[1]) {
                parts.push(`created_at:>='${filter.values[0]}'+created_at:<='${filter.values[1]}'`);
            }
            break;
        case 'body':
            if (filter.values[0]) {
                const value = filter.values[0] as string;
                // Escape single quotes in the value
                const escapedValue = value.replace(/'/g, '\\\'');
                
                if (filter.operator === 'contains') {
                    parts.push(`html:~'${escapedValue}'`);
                } else if (filter.operator === 'not_contains') {
                    parts.push(`html:-~'${escapedValue}'`);
                }
            }
            break;
        case 'post':
            if (filter.values[0]) {
                if (filter.operator === 'is_not') {
                    parts.push(`post_id:-${filter.values[0]}`);
                } else {
                    // Default to 'is' operator
                    parts.push(`post_id:${filter.values[0]}`);
                }
            }
            break;
        case 'author':
            if (filter.values[0]) {
                if (filter.operator === 'is_not') {
                    parts.push(`member_id:-${filter.values[0]}`);
                } else {
                    // Default to 'is' operator
                    parts.push(`member_id:${filter.values[0]}`);
                }
            }
            break;
        }
    }
    
    return parts.length ? parts.join('+') : undefined;
}

const Comments: React.FC = () => {
    const [filters, setFilters] = useState<Filter[]>([]);
    
    const apiFilter = useMemo(() => buildCommentsFilter(filters), [filters]);
    
    const {
        data,
        isError,
        isLoading,
        isFetchingNextPage,
        fetchNextPage,
        hasNextPage
    } = useBrowseComments({
        searchParams: apiFilter ? {filter: apiFilter} : {}
    });

    const handleAddFilter = useCallback((field: string, value: string, operator: string = 'is') => {
        setFilters((prevFilters) => {
            // Remove any existing filter for the same field
            const filtered = prevFilters.filter(f => f.field !== field);
            // Add the new filter
            return [...filtered, createFilter(field, operator, [value])];
        });
    }, []);

    return (
        <CommentsLayout>
            <CommentsHeader filters={filters} onFiltersChange={setFilters} />
            <CommentsContent>
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <LoadingIndicator size="lg" />
                    </div>
                ) : isError ? (
                    <div className="mb-16 flex h-full flex-col items-center justify-center">
                        <h2 className="mb-2 text-xl font-medium">
                            Error loading comments
                        </h2>
                        <p className="mb-4 text-muted-foreground">
                            Please reload the page to try again
                        </p>
                        <Button onClick={() => window.location.reload()}>
                            Reload page
                        </Button>
                    </div>
                ) : !data?.comments.length ? (
                    <div className="flex h-full items-center justify-center">
                        <EmptyIndicator
                            title="No comments yet"
                        >
                            <LucideIcon.MessageSquare />
                        </EmptyIndicator>
                    </div>
                ) : (
                    <CommentsList
                        fetchNextPage={fetchNextPage}
                        hasNextPage={hasNextPage}
                        isFetchingNextPage={isFetchingNextPage}
                        items={data?.comments ?? []}
                        totalItems={data?.meta?.pagination?.total ?? 0}
                        onAddFilter={handleAddFilter}
                    />
                )}
            </CommentsContent>
        </CommentsLayout>
    );
};

export default Comments;
