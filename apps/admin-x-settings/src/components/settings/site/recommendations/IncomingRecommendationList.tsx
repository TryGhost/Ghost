import Button from '../../../../admin-x-ds/global/Button';
import NoValueLabel from '../../../../admin-x-ds/global/NoValueLabel';
import React, {useMemo} from 'react';
import RecommendationIcon from './RecommendationIcon';
import Table, {ShowMoreData} from '../../../../admin-x-ds/global/Table';
import TableCell from '../../../../admin-x-ds/global/TableCell';
import TableRow from '../../../../admin-x-ds/global/TableRow';
import useRouting from '../../../../hooks/useRouting';
import {IncomingRecommendation} from '../../../../api/recommendations';
import {PaginationData} from '../../../../hooks/usePagination';
import {ReferrerHistoryItem} from '../../../../api/referrers';

interface IncomingRecommendationListProps {
    incomingRecommendations: IncomingRecommendation[],
    stats: ReferrerHistoryItem[],
    pagination?: PaginationData,
    showMore?: ShowMoreData,
    isLoading: boolean
}

const IncomingRecommendationItem: React.FC<{incomingRecommendation: IncomingRecommendation, stats: ReferrerHistoryItem[]}> = ({incomingRecommendation, stats}) => {
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

    const showDetails = () => {
        window.open(incomingRecommendation.url, '_blank');
    };

    const freeMembersLabel = signups === 1 ? 'free member' : 'free members';

    const {updateRoute} = useRouting();

    const action = (
        <div className="flex items-center justify-end">
            <Button color='green' label='Recommend back' size='sm' link onClick={() => {
                updateRoute({route: `recommendations/add?url=${incomingRecommendation.url}`});
            }} />
        </div>
    );

    return (
        <TableRow action={action} hideActions>
            <TableCell onClick={showDetails}>
                <div className='group flex items-center gap-3 hover:cursor-pointer'>
                    <div className={`flex grow flex-col`}>
                        <div className="mb-0.5 flex items-center gap-3">
                            <RecommendationIcon favicon={incomingRecommendation.favicon} featured_image={incomingRecommendation.featured_image} title={incomingRecommendation.title || incomingRecommendation.url} />
                            <span className='line-clamp-1'>{incomingRecommendation.title || incomingRecommendation.url}</span>
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell className='hidden align-middle md:!visible md:!table-cell' onClick={showDetails}>
                {signups === 0 ? <span className="text-grey-500">-</span> : (<div className='-mt-px flex grow items-end gap-1'><span>{signups}</span><span className='-mb-px whitespace-nowrap text-sm lowercase text-grey-700'>{freeMembersLabel}</span></div>)}
            </TableCell>
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
            <span className='max-w-[40ch] text-center'>No one’s recommended you yet. Once they do, you’ll find them here along with how many memberships each has driven.</span>
        </NoValueLabel>;
    }
};

export default IncomingRecommendationList;
