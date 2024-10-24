import React, {useMemo} from 'react';
import RecommendationIcon from './RecommendationIcon';
import {Button, NoValueLabel, PaginationData, ShowMoreData, Table, TableCell, TableRow} from '@tryghost/admin-x-design-system';
import {IncomingRecommendation} from '@tryghost/admin-x-framework/api/recommendations';
import {ReferrerHistoryItem} from '@tryghost/admin-x-framework/api/referrers';
import {numberWithCommas} from '../../../../utils/helpers';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface IncomingRecommendationListProps {
    incomingRecommendations: IncomingRecommendation[],
    stats: ReferrerHistoryItem[],
    pagination?: PaginationData,
    showMore?: ShowMoreData,
    isLoading: boolean
}

const IncomingRecommendationItem: React.FC<{incomingRecommendation: IncomingRecommendation, stats: ReferrerHistoryItem[]}> = ({incomingRecommendation, stats}) => {
    const {updateRoute} = useRouting();

    const signups = useMemo(() => {
        // Note: this should match the `getDomainFromUrl` method from OutboundLinkTagger
        let cleanedDomain = incomingRecommendation.url;
        try {
            cleanedDomain = new URL(incomingRecommendation.url).hostname.replace(/^www\./, '');
        } catch (_) {
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
        <TableRow action={
            !incomingRecommendation.recommending_back && (
                <div className="flex items-center justify-end">
                    <Button color='green' label='Recommend back' size='sm' link onClick={recommendBack}
                    />
                </div>
            )
        } testId='incoming-recommendation-list-item' hideActions>
            <TableCell className='w-80' onClick={showDetails}>
                <div className='group flex items-center gap-3 hover:cursor-pointer'>
                    <div className={`flex grow flex-col`}>
                        <div className="flex items-center gap-3">
                            <RecommendationIcon favicon={incomingRecommendation.favicon} featured_image={incomingRecommendation.featured_image} title={incomingRecommendation.title || incomingRecommendation.url} />
                            <span className='line-clamp-1 font-medium'>{incomingRecommendation.title || incomingRecommendation.url}</span>
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell className='hidden w-auto whitespace-nowrap text-left align-middle md:!visible md:!table-cell' padding={false} onClick={showDetails}>
                {(signups === 0) ? (
                    <span className="text-grey-500 dark:text-grey-900">-</span>
                ) : (
                    <div className='mr-2'>
                        <span>{numberWithCommas(signups)}</span>
                    </div>
                )}
            </TableCell>
            <TableCell className='hidden w-[1%] whitespace-nowrap align-middle md:!visible md:!table-cell' onClick={showDetails}>
                {(signups === 0) ? (null) : (
                    <div className='-mt-px text-left'>
                        <span className='-mb-px inline-block min-w-[60px] whitespace-nowrap text-left text-sm lowercase text-grey-700'>{freeMembersLabel}</span>
                    </div>
                )}
            </TableCell>
            {incomingRecommendation.recommending_back && <TableCell className='w-[1%] whitespace-nowrap group-hover/table-row:visible md:invisible'><div className='mt-1 whitespace-nowrap text-right text-sm text-grey-700'>Recommending</div></TableCell>}
        </TableRow>
    );
};

const IncomingRecommendationList: React.FC<IncomingRecommendationListProps> = ({incomingRecommendations, stats, pagination, showMore, isLoading}) => {
    if (isLoading || incomingRecommendations.length) {
        return <Table isLoading={isLoading} pagination={pagination} showMore={showMore} hintSeparator>
            {incomingRecommendations.map(rec => <IncomingRecommendationItem key={rec.id} incomingRecommendation={rec} stats={stats} />)}
        </Table>;
    } else {
        return <NoValueLabel>
            <span className='max-w-[40ch] text-center'>No one&rsquo;s recommended you yet. Once they do, you&rsquo;ll find them here along with how many memberships they&rsquo;ve driven.</span>
        </NoValueLabel>;
    }
};

export default IncomingRecommendationList;
