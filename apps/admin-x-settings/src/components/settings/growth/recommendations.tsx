import IncomingRecommendationList from './recommendations/incoming-recommendation-list';
import React, {useState} from 'react';
import RecommendationList from './recommendations/recommendation-list';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {Button} from '@tryghost/shade/components';
import {Tabs, TabsContent, TabsList, TabsTrigger, TabsTriggerCount} from '@tryghost/shade/components';
import {formatNumber} from '@tryghost/shade/utils';
import {keepPreviousData} from '@tanstack/react-query';
import {useBrowseIncomingRecommendations, useBrowseRecommendations} from '@tryghost/admin-x-framework/api/recommendations';
import {useReferrerHistory} from '@tryghost/admin-x-framework/api/referrers';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {withErrorBoundary} from '../../error-boundary';

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
        placeholderData: keepPreviousData
    });

    const showMoreRecommendations = {
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
        placeholderData: keepPreviousData
    });

    const {data: {stats} = {}, isLoading: areStatsLoading} = useReferrerHistory({});

    const showMoreMentions = {
        hasMore: !!hasIncomingRecommendationsNextPage,
        loadMore: fetchIncomingRecommendationsNextPage
    };

    // Select "Your recommendations" by default
    const [selectedTab, setSelectedTab] = useState('your-recommendations');

    const groupDescription = (
        <>Recommend any publication that your audience will find valuable, and find out when others are recommending you.</>
    );

    // Add a new recommendation
    const {updateRoute} = useRouting();
    const openAddNewRecommendationModal = () => {
        updateRoute('recommendations/add');
    };

    const buttons = (
        <Button className='mt-[-5px] hidden md:!visible md:!block' size='sm' type='button' variant='ghost' onClick={() => {
            openAddNewRecommendationModal();
        }}>Add recommendation</Button>
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
                <Button type='button' variant='ghost' onClick={() => {
                    openAddNewRecommendationModal();
                }}>Add recommendation</Button>
            </div>
            <Tabs value={selectedTab} variant='underline' onValueChange={setSelectedTab}>
                <TabsList>
                    <TabsTrigger value='your-recommendations'>
                        Your recommendations
                        {typeof recommendationsMeta?.pagination?.total === 'number' && <TabsTriggerCount>{formatNumber(recommendationsMeta.pagination.total)}</TabsTriggerCount>}
                    </TabsTrigger>
                    <TabsTrigger value='recommending-you'>
                        Recommending you
                        {typeof incomingRecommendationsMeta?.pagination?.total === 'number' && <TabsTriggerCount>{formatNumber(incomingRecommendationsMeta.pagination.total)}</TabsTriggerCount>}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value='your-recommendations'><RecommendationList isLoading={areRecommendationsLoading} recommendations={recommendations ?? []} showMore={showMoreRecommendations}/></TabsContent>
                <TabsContent value='recommending-you'><IncomingRecommendationList incomingRecommendations={incomingRecommendations ?? []} isLoading={areIncomingRecommendationsLoading || areStatsLoading} showMore={showMoreMentions} stats={stats ?? []}/></TabsContent>
            </Tabs>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Recommendations, 'Recommendations');
