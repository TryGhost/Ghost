import NoValueLabel from '../../../../admin-x-ds/global/NoValueLabel';
import React from 'react';
import RecommendationIcon from './RecommendationIcon';
import Table from '../../../../admin-x-ds/global/Table';
import TableCell from '../../../../admin-x-ds/global/TableCell';
import TableRow from '../../../../admin-x-ds/global/TableRow';
import {Mention} from '../../../../api/mentions';
import {PaginationData} from '../../../../hooks/usePagination';

interface IncomingRecommendationListProps {
    mentions: Mention[],
    pagination: PaginationData,
    isLoading: boolean
}

const IncomingRecommendationItem: React.FC<{mention: Mention}> = ({mention}) => {
    const cleanedSource = mention.source.replace('/.well-known/recommendations.json', '');

    const showDetails = () => {
        // Open url
        window.open(cleanedSource, '_blank');
    };

    return (
        <TableRow hideActions>
            <TableCell onClick={showDetails}>
                <div className='group flex items-center gap-3 hover:cursor-pointer'>
                    <div className={`flex grow flex-col`}>
                        <div className="mb-1 flex items-center gap-2">
                            <RecommendationIcon favicon={mention.source_favicon} featured_image={mention.source_featured_image} title={mention.source_title || mention.source_site_title || cleanedSource} />
                            <span className='line-clamp-1'>{mention.source_title || mention.source_site_title || cleanedSource}</span>
                        </div>
                        <span className='line-clamp-1 text-xs leading-snug text-grey-700'>{mention.source_excerpt || cleanedSource}</span>
                    </div>
                </div>
            </TableCell>
            {/* <TableCell className='hidden md:!visible md:!table-cell' onClick={showDetails}>
                <div className={`flex grow flex-col`}>
                    If it's 0
                    <span className="text-grey-500">-</span>
                    If it's more than 0
                    <span>12</span>
                    <span className='whitespace-nowrap text-xs text-grey-700'>Subscribers gained</span>
                </div>
            </TableCell> */}
        </TableRow>
    );
};

const IncomingRecommendationList: React.FC<IncomingRecommendationListProps> = ({mentions, pagination, isLoading}) => {
    if (isLoading || mentions.length) {
        return <Table isLoading={isLoading} pagination={pagination}>
            {mentions.map(mention => <IncomingRecommendationItem key={mention.id} mention={mention} />)}
        </Table>;
    } else {
        return <NoValueLabel>
            <span className='max-w-[40ch] text-center'>No one’s recommended you yet. Once they do, you’ll find them here along with how many memberships each has driven.</span>
        </NoValueLabel>;
    }
};

export default IncomingRecommendationList;
