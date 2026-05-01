import OverviewDateRange from './overview-date-range';
import OverviewKpiTabs from './overview-kpi-tabs';
import OverviewTopMembers from './overview-top-members';
import OverviewTopPosts from './overview-top-posts';
import React, {useMemo} from 'react';
import {CommentsOverview as CommentsOverviewPayload, CommentsOverviewResponseType, useCommentsOverview} from '@tryghost/admin-x-framework/api/stats';

interface CommentsAnalyticsProps {
    range: number;
    setRange: (range: number) => void;
    dateFrom: string;
    dateTo: string;
    /**
     * Applies a filter to the moderation list rendered alongside this rail.
     * Used by top-posts/commenters row clicks and chart bar clicks.
     */
    onAddFilter: (field: string, value: string, operator?: string) => void;
}

const EMPTY_OVERVIEW: CommentsOverviewPayload = {
    totals: {comments: 0, commenters: 0, reported: 0},
    series: [],
    topPosts: [],
    topMembers: []
};

const CommentsAnalytics: React.FC<CommentsAnalyticsProps> = ({range, setRange, dateFrom, dateTo, onAddFilter}) => {
    const searchParams = useMemo(() => ({
        date_from: dateFrom,
        date_to: dateTo
    }), [dateFrom, dateTo]);

    const {data, isLoading} = useCommentsOverview({searchParams}) as {
        data: CommentsOverviewResponseType | undefined;
        isLoading: boolean;
    };

    const overview = data?.stats?.[0] ?? EMPTY_OVERVIEW;

    return (
        <div className='flex flex-col gap-5 pb-6' data-testid='comments-analytics'>
            <div className='flex items-center justify-between gap-3'>
                <h2 className='text-lg font-semibold tracking-tight'>Analytics</h2>
                <OverviewDateRange range={range} onRangeChange={setRange} />
            </div>
            <OverviewKpiTabs
                isLoading={isLoading}
                range={range}
                series={data ? overview.series : undefined}
                totals={data ? overview.totals : undefined}
                onAddFilter={onAddFilter}
            />
            <OverviewTopPosts
                isLoading={isLoading}
                posts={data ? overview.topPosts : undefined}
                range={range}
                onRowClick={postId => onAddFilter('post', postId)}
            />
            <OverviewTopMembers
                isLoading={isLoading}
                members={data ? overview.topMembers : undefined}
                range={range}
                onRowClick={memberId => onAddFilter('author', memberId)}
            />
        </div>
    );
};

export default CommentsAnalytics;
