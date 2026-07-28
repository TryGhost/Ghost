import EditRecommendationModal from './edit-recommendation-modal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import RecommendationIcon from './recommendation-icon';
import useSettingGroup from '../../../../hooks/use-setting-group';
import {ActionList, ActionListItem, ActionListItemContent, Button, LoadingIndicator, NoValueLabel, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {type Recommendation} from '@tryghost/admin-x-framework/api/recommendations';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface RecommendationListProps {
    recommendations: Recommendation[],
    showMore?: {hasMore: boolean; loadMore: () => void},
    isLoading: boolean
}

const RecommendationItem: React.FC<{recommendation: Recommendation}> = ({recommendation}) => {
    const {route} = useRouting();

    // Navigate to the edit page, without changing the route
    // This helps to avoid fetching the recommendation
    const showDetails = () => {
        NiceModal.show(EditRecommendationModal, {
            pathName: route,
            animate: false,
            recommendation: recommendation
        });
    };

    const isGhostSite = recommendation.one_click_subscribe;
    const showSubscribers = isGhostSite && !!recommendation.count?.subscribers;
    const count = (showSubscribers ? recommendation.count?.subscribers : recommendation.count?.clicks) || 0;
    const newMembers = count === 1 ? 'signup' : 'signups';
    const clicks = count === 1 ? 'click' : 'clicks';

    return (
        <ActionListItem className='group' data-testid='recommendation-list-item'>
            <ActionListItemContent asChild>
                <button className='flex w-full text-left' type='button' onClick={showDetails}>
                <div className='grow py-3 pr-6'>
                    <Inline gap='md'>
                        <RecommendationIcon isGhostSite={isGhostSite} {...recommendation} />
                        <span className='line-clamp-1 font-medium'>{recommendation.title}</span>
                    </Inline>
                </div>
                <div className='hidden py-3 pr-6 text-left whitespace-nowrap md:block'>
                    {count === 0 ? (
                        <span className="text-muted-foreground">-</span>
                    ) : (
                        <div className='flex items-center'>
                            <div className='mr-2'>
                                <span>{formatNumber(count)}</span>
                            </div>
                            <div className='text-muted-foreground lowercase'>
                                <span>{showSubscribers ? newMembers : clicks}</span>
                                <span className='invisible group-hover:visible'> from you</span>
                            </div>
                        </div>
                    )}
                </div>
                </button>
            </ActionListItemContent>
        </ActionListItem>
    );
};

const RecommendationList: React.FC<RecommendationListProps> = ({recommendations, showMore, isLoading}) => {
    const {
        siteData
    } = useSettingGroup();
    const recommendationsURL = `${siteData?.url.replace(/\/$/, '')}/#/portal/recommendations`;

    const {updateRoute} = useRouting();
    const openAddNewRecommendationModal = () => {
        updateRoute('recommendations/add');
    };

    const [copied, setCopied] = useState(false);

    const copyRecommendationsUrl = () => {
        navigator.clipboard.writeText(recommendationsURL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLoading) {
        return <div className='flex justify-center p-5'><LoadingIndicator size='md' /></div>;
    }

    if (recommendations.length) {
        return <>
            <ActionList>
                {recommendations.map(recommendation => <RecommendationItem key={recommendation.id} recommendation={recommendation} />)}
            </ActionList>
            <div className='border-t border-border pt-2'>
                {showMore?.hasMore && <Button className='mb-2 h-auto p-0 text-green hover:text-green' type='button' variant='link' onClick={showMore.loadMore}>Show all</Button>}
                <div className='text-sm text-muted-foreground'>
                    Shared with new members after signup, or anytime using <a className='text-green hover:text-green-400' href={recommendationsURL} rel='noopener noreferrer' target='_blank'>this link</a>
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    aria-label={copied ? 'Copied' : 'Copy'}
                                    className='ml-1 size-6 align-middle leading-none'
                                    size='icon'
                                    type='button'
                                    variant='ghost'
                                    onClick={copyRecommendationsUrl}
                                >{copied ? <LucideIcon.CircleCheck className='size-3.5! text-green' /> : <LucideIcon.Copy className='size-3.5! text-muted-foreground' />}</Button>
                            </TooltipTrigger>
                            <TooltipContent>{copied ? 'Copied' : 'Copy link'}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </>;
    } else {
        return <NoValueLabel>
            <Button size='sm' type='button' variant='secondary' onClick={() => {
                openAddNewRecommendationModal();
            }}>Add first recommendation</Button>
            <span className='mt-2 max-w-[40ch] text-center text-sm'>Need inspiration? <a className='text-green hover:text-green-400' href="https://ghost.org/explore" rel='noopener noreferrer' target='_blank'>Explore thousands of sites</a></span>
        </NoValueLabel>;
    }
};

export default RecommendationList;
