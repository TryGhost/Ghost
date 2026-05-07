import OverviewDateRange from './overview-date-range';
import OverviewKpiTabs from './overview-kpi-tabs';
import OverviewTopMembers from './overview-top-members';
import OverviewTopPosts from './overview-top-posts';
import React, {useMemo} from 'react';
import {Button} from '@tryghost/shade/components';
import {CommentsOverview as CommentsOverviewPayload, CommentsOverviewResponseType, useCommentsOverview} from '@tryghost/admin-x-framework/api/stats';
import type {CommentFilterUpdate} from '../hooks/use-filter-state';

interface CommentsAnalyticsProps {
    range: number;
    setRange: (range: number) => void;
    dateFrom: string;
    dateTo: string;
    timezone: string;
    /**
     * Applies a filter to the moderation list rendered alongside this rail.
     * Used by top-posts/commenters row clicks and chart bar clicks.
     */
    onAddFilters: (filters: CommentFilterUpdate[]) => void;
}

const EMPTY_OVERVIEW: CommentsOverviewPayload = {
    totals: {comments: 0, commenters: 0, reported: 0},
    previousTotals: null,
    series: [],
    topPosts: [],
    topMembers: []
};

const CommentsAnalytics: React.FC<CommentsAnalyticsProps> = ({range, setRange, dateFrom, dateTo, timezone, onAddFilters}) => {
    const searchParams = useMemo(() => ({
        date_from: dateFrom,
        date_to: dateTo,
        timezone
    }), [dateFrom, dateTo, timezone]);

    const {data, isError, isLoading, refetch} = useCommentsOverview({searchParams, defaultErrorHandler: false}) as {
        data: CommentsOverviewResponseType | undefined;
        isError: boolean;
        isLoading: boolean;
        refetch: () => void;
    };

    const overview = data?.stats?.[0] ?? EMPTY_OVERVIEW;

    return (
        <div className='flex flex-col gap-5 pb-6' data-testid='comments-analytics'>
            <div className='flex items-center justify-between gap-3'>
                <h2 className='text-lg font-semibold tracking-tight'>Analytics</h2>
                <OverviewDateRange range={range} onRangeChange={setRange} />
            </div>
            {isError ? (
                <div className='rounded-md border border-border bg-background p-4 text-sm'>
                    <div className='font-medium text-foreground'>Could not load analytics</div>
                    <div className='mt-1 text-muted-foreground'>Try again, or reload the page if the problem continues.</div>
                    <Button className='mt-3' size='sm' variant='outline' onClick={() => refetch()}>
                        Retry
                    </Button>
                </div>
            ) : (
                <>
                    <OverviewKpiTabs
                        isLoading={isLoading}
                        previousTotals={data ? overview.previousTotals : undefined}
                        range={range}
                        series={data ? overview.series : undefined}
                        totals={data ? overview.totals : undefined}
                        onAddFilters={onAddFilters}
                    />
                    <OverviewTopPosts
                        isLoading={isLoading}
                        posts={data ? overview.topPosts : undefined}
                        range={range}
                        onRowClick={postId => onAddFilters([{field: 'post', value: postId}])}
                    />
                    <OverviewTopMembers
                        isLoading={isLoading}
                        members={data ? overview.topMembers : undefined}
                        range={range}
                        onRowClick={memberId => onAddFilters([{field: 'author', value: memberId}])}
                    />
                </>
            )}
        </div>
    );
};

export default CommentsAnalytics;
