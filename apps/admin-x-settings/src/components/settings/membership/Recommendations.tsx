import Button from '../../../admin-x-ds/global/Button';
import IncomingRecommendationList from './recommendations/IncomingRecommendationList';
import React, {useState} from 'react';
import RecommendationList from './recommendations/RecommendationList';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import useRouting from '../../../hooks/useRouting';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {ShowMoreData} from '../../../admin-x-ds/global/Table';
import {useBrowseIncomingRecommendations, useBrowseRecommendations} from '../../../api/recommendations';
import {useReferrerHistory} from '../../../api/referrers';
import {withErrorBoundary} from '../../../admin-x-ds/global/ErrorBoundary';

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

            const newPage = limit < 100 ? 1 : (page + 1);

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

            const newPage = limit < 100 ? 1 : (page + 1);

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
        <Button className='hidden md:!visible md:!block' color='green' label='Add recommendation' link={true} onClick={() => {
            openAddNewRecommendationModal();
        }} />
    );

    return (
        <SettingGroup
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
                <Button color='green' label='Add recommendation' link onClick={() => {
                    openAddNewRecommendationModal();
                }} />
            </div>
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
        </SettingGroup>
    );
};

export default withErrorBoundary(Recommendations, 'Recommendations');
