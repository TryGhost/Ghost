import IncomingRecommendationList from './recommendations/IncomingRecommendationList';
import React, {useState} from 'react';
import RecommendationList from './recommendations/RecommendationList';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {Button, ShowMoreData, TabView, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {useBrowseIncomingRecommendations, useBrowseRecommendations} from '@tryghost/admin-x-framework/api/recommendations';
import {useReferrerHistory} from '@tryghost/admin-x-framework/api/referrers';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const Recommendations: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        saveState,
        handleSave
    } = useSettingGroup();

    // Fetch "Your recommendations"
    const {data: {meta: recommendationsMeta, recommendations} = {}, isLoading: areRecommendationsLoading, hasNextPage, fetchNextPage} = useBrowseRecommendations({
        searchParams: {
            include: 'count.clicks,count.subscribers',
            order: 'created_at desc',
            limit: '5'
        },

        // We first load 5, then load 100 at a time (= show all, but without using the dangerous 'all' limit)
        getNextPageParams: (lastPage, otherParams) => {
            if (!lastPage.meta) {
                return;
            }
            const {limit, page, pages} = lastPage.meta.pagination;
            if (page >= pages) {
                return;
            }

            const newPage = typeof limit === 'number' && limit < 100 ? 1 : (page + 1);

            return {
                ...otherParams,
                page: newPage.toString(),
                limit: '100'
            };
        },
        keepPreviousData: true
    });

    const showMoreRecommendations: ShowMoreData = {
        hasMore: !!hasNextPage,
        loadMore: fetchNextPage
    };

    // Fetch "Recommending you", including stats
    const {data: {recommendations: incomingRecommendations, meta: incomingRecommendationsMeta} = {}, isLoading: areIncomingRecommendationsLoading, hasNextPage: hasIncomingRecommendationsNextPage, fetchNextPage: fetchIncomingRecommendationsNextPage} = useBrowseIncomingRecommendations({
        searchParams: {
            limit: '5',
            order: 'created_at desc'
        },

        // We first load 5, then load 100 at a time (= show all, but without using the dangerous 'all' limit)
        getNextPageParams: (lastPage, otherParams) => {
            if (!lastPage.meta) {
                return;
            }
            const {limit, page, pages} = lastPage.meta.pagination;
            if (page >= pages) {
                return;
            }

            const newPage = typeof limit === 'number' && limit < 100 ? 1 : (page + 1);

            return {
                ...otherParams,
                page: newPage.toString(),
                limit: '100'
            };
        },
        keepPreviousData: true
    });

    const {data: {stats} = {}, isLoading: areStatsLoading} = useReferrerHistory({});

    const showMoreMentions: ShowMoreData = {
        hasMore: !!hasIncomingRecommendationsNextPage,
        loadMore: fetchIncomingRecommendationsNextPage
    };

    // Select "Your recommendations" by default
    const [selectedTab, setSelectedTab] = useState('your-recommendations');

    const tabs = [
        {
            id: 'your-recommendations',
            title: `Your recommendations`,
            counter: recommendationsMeta?.pagination?.total,
            contents: <RecommendationList isLoading={areRecommendationsLoading} recommendations={recommendations ?? []} showMore={showMoreRecommendations}/>
        },
        {
            id: 'recommending-you',
            title: `Recommending you`,
            counter: incomingRecommendationsMeta?.pagination?.total,
            contents: <IncomingRecommendationList incomingRecommendations={incomingRecommendations ?? []} isLoading={areIncomingRecommendationsLoading || areStatsLoading} showMore={showMoreMentions} stats={stats ?? []}/>
        }
    ];

    const groupDescription = (
        <>Recommend any publication that your audience will find valuable, and find out when others are recommending you.</>
    );

    // Add a new recommendation
    const {updateRoute} = useRouting();
    const openAddNewRecommendationModal = () => {
        updateRoute('recommendations/add');
    };

    const buttons = (
        <Button className='mt-[-5px] hidden md:!visible md:!block' color='clear' label='Add recommendation' size='sm' onClick={() => {
            openAddNewRecommendationModal();
        }} />
    );

    return (
        <TopLevelGroup
            beta={true}
            customButtons={buttons}
            description={groupDescription}
            keywords={keywords}
            navid='recommendations'
            saveState={saveState}
            testId='recommendations'
            title="Recommendations"
            onSave={handleSave}
        >
            <div className='flex justify-center rounded border border-green px-4 py-2 md:hidden'>
                <Button color='light-grey' label='Add recommendation' link onClick={() => {
                    openAddNewRecommendationModal();
                }} />
            </div>
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Recommendations, 'Recommendations');
