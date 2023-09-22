import Button from '../../../admin-x-ds/global/Button';
import IncomingRecommendations from './recommendations/IncomingRecommendations';
import React, {useState} from 'react';
import RecommendationList from './recommendations/RecommendationList';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import useRouting from '../../../hooks/useRouting';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {ShowMoreData} from '../../../admin-x-ds/global/Table';
import {useBrowseRecommendations} from '../../../api/recommendations';
import {withErrorBoundary} from '../../../admin-x-ds/global/ErrorBoundary';

const Recommendations: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        saveState,
        handleSave
    } = useSettingGroup();

    const {data: {recommendations} = {}, isLoading, hasNextPage, fetchNextPage} = useBrowseRecommendations({
        searchParams: {
            include: 'count.clicks,count.subscribers',
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

    const showMore: ShowMoreData = {
        hasMore: !!hasNextPage,
        loadMore: fetchNextPage
    };
    const [selectedTab, setSelectedTab] = useState('your-recommendations');

    const {updateRoute} = useRouting();
    const openAddNewRecommendationModal = () => {
        updateRoute('recommendations/add');
    };

    const buttons = (
        <Button className='hidden md:!visible md:!block' color='green' label='Add recommendation' link={true} onClick={() => {
            openAddNewRecommendationModal();
        }} />
    );

    const tabs = [
        {
            id: 'your-recommendations',
            title: 'Your recommendations',
            contents: (<RecommendationList isLoading={isLoading} recommendations={recommendations ?? []} showMore={showMore}/>)
        },
        {
            id: 'recommending-you',
            title: 'Recommending you',
            contents: (<IncomingRecommendations />)
        }
    ];

    const groupDescription = (
        <>Recommend any publication you think your audience will find valuable, and find out when others are recommending you.</>
    );

    return (
        <SettingGroup
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
