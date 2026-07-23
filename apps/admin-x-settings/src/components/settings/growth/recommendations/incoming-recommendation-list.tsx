import React, {useMemo} from 'react';
import RecommendationIcon from './recommendation-icon';
import {ActionList, ActionListItem, ActionListItemActions, ActionListItemContent, LoadingIndicator, NoValueLabel} from '@tryghost/shade/components';
import {Button} from '@tryghost/shade/components';
import {type IncomingRecommendation} from '@tryghost/admin-x-framework/api/recommendations';
import {Inline} from '@tryghost/shade/primitives';
import {type ReferrerHistoryItem} from '@tryghost/admin-x-framework/api/referrers';
import {formatNumber} from '@tryghost/shade/utils';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface IncomingRecommendationListProps {
    incomingRecommendations: IncomingRecommendation[],
    stats: ReferrerHistoryItem[],
    showMore?: {hasMore: boolean; loadMore: () => void},
    isLoading: boolean
}

const IncomingRecommendationItem: React.FC<{incomingRecommendation: IncomingRecommendation, stats: ReferrerHistoryItem[]}> = ({incomingRecommendation, stats}) => {
    const {updateRoute} = useRouting();

    const signups = useMemo(() => {
        // Note: this should match the `getDomainFromUrl` method from OutboundLinkTagger
        let cleanedDomain = incomingRecommendation.url;
        try {
            cleanedDomain = new URL(incomingRecommendation.url).hostname.replace(/^www\./, '');
        } catch {
            // Ignore invalid urls
        }

        return stats.reduce((s, stat) => {
            if (stat.source === cleanedDomain) {
                return s + stat.signups;
            }
            return s;
        }, 0);
    }, [stats, incomingRecommendation.url]);

    const recommendBack = () => {
        updateRoute({route: `recommendations/add?url=${incomingRecommendation.url}`});
    };

    const showDetails = () => {
        window.open(incomingRecommendation.url, '_blank');
    };

    const freeMembersLabel = signups === 1 ? 'free member' : 'free members';

    return (
        <ActionListItem data-testid='incoming-recommendation-list-item'>
            <ActionListItemContent asChild>
                <button className='flex w-full text-left' type='button' onClick={showDetails}>
                    <Inline className='w-full' gap='none'>
                        <div className='grow py-3 pr-6'>
                            <Inline className='group' gap='md'>
                                <RecommendationIcon favicon={incomingRecommendation.favicon} featured_image={incomingRecommendation.featured_image} title={incomingRecommendation.title || incomingRecommendation.url} />
                                <span className='line-clamp-1 font-medium'>{incomingRecommendation.title || incomingRecommendation.url}</span>
                            </Inline>
                        </div>
                        <div className='hidden py-3 pr-6 text-left whitespace-nowrap md:block'>
                            {(signups === 0) ? (
                                <span className="text-muted-foreground">-</span>
                            ) : (
                                <div className='mr-2'>
                                    <span>{formatNumber(signups)}</span>
                                </div>
                            )}
                        </div>
                        <div className='hidden w-[1%] py-3 pr-6 whitespace-nowrap md:block'>
                            {(signups === 0) ? (null) : (
                                <div className='-mt-px text-left'>
                                    <span className='-mb-px inline-block min-w-[60px] text-left whitespace-nowrap text-muted-foreground lowercase'>{freeMembersLabel}</span>
                                </div>
                            )}
                        </div>
                        {incomingRecommendation.recommending_back && <div className='w-[1%] py-3 pr-6 whitespace-nowrap md:invisible md:group-hover/action-list-item:visible'><div className='mt-1 text-right whitespace-nowrap text-muted-foreground'>Recommending</div></div>}
                    </Inline>
                </button>
            </ActionListItemContent>
            {!incomingRecommendation.recommending_back && (
                <ActionListItemActions visibility='hover'>
                <div className="flex items-center justify-end">
                    <Button size='sm' type='button' variant='ghost' onClick={recommendBack}>Recommend back</Button>
                </div>
                </ActionListItemActions>
            )}
        </ActionListItem>
    );
};

const IncomingRecommendationList: React.FC<IncomingRecommendationListProps> = ({incomingRecommendations, stats, showMore, isLoading}) => {
    if (isLoading) {
        return <div className='flex justify-center p-5'><LoadingIndicator size='md' /></div>;
    }

    if (incomingRecommendations.length) {
        return <>
            <ActionList>
                {incomingRecommendations.map(rec => <IncomingRecommendationItem key={rec.id} incomingRecommendation={rec} stats={stats} />)}
            </ActionList>
            {showMore?.hasMore && <div className='border-t border-border pt-2'><Button className='h-auto p-0 text-green hover:text-green' type='button' variant='link' onClick={showMore.loadMore}>Show all</Button></div>}
        </>;
    } else {
        return <NoValueLabel>
            <span className='max-w-[40ch] text-center'>No one&rsquo;s recommended you yet. Once they do, you&rsquo;ll find them here along with how many memberships they&rsquo;ve driven.</span>
        </NoValueLabel>;
    }
};

export default IncomingRecommendationList;
