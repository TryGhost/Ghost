import NoValueLabel from '../../../../admin-x-ds/global/NoValueLabel';
import React from 'react';
import RecommendationIcon from './RecommendationIcon';
import Table from '../../../../admin-x-ds/global/Table';
import TableCell from '../../../../admin-x-ds/global/TableCell';
import TableRow from '../../../../admin-x-ds/global/TableRow';
import useRouting from '../../../../hooks/useRouting';
import {PaginationData} from '../../../../hooks/usePagination';
import {Recommendation} from '../../../../api/recommendations';

interface RecommendationListProps {
    recommendations: Recommendation[],
    pagination: PaginationData,
    isLoading: boolean
}

const RecommendationItem: React.FC<{recommendation: Recommendation}> = ({recommendation}) => {
    const {updateRoute} = useRouting();

    const showDetails = () => {
        updateRoute({route: `recommendations/${recommendation.id}`});
    };

    const showSubscribes = recommendation.one_click_subscribe && (recommendation.count?.subscribers || recommendation.count?.clicks === 0);
    const count = (showSubscribes ? recommendation.count?.subscribers : recommendation.count?.clicks) || 0;

    return (
        <TableRow>
            <TableCell onClick={showDetails}>
                <div className='group flex items-center gap-3 hover:cursor-pointer'>
                    <div className={`flex grow flex-col`}>
                        <div className="mb-1 flex items-center gap-2">
                            <RecommendationIcon {...recommendation} />
                            <span className='line-clamp-1'>{recommendation.title}</span>
                        </div>
                        <span className='line-clamp-1 text-xs leading-snug text-grey-700'>{recommendation.reason || 'No reason added'}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell className='hidden md:!visible md:!table-cell' onClick={showDetails}>
                <div className={`flex grow flex-col`}>
                    {count === 0 ? <span className="text-grey-500">-</span> : <span>{count}</span>}
                    <span className='whitespace-nowrap text-xs text-grey-700'>{showSubscribes ? 'Subscribers from you' : 'Clicks from you'}</span>
                </div>
            </TableCell>
        </TableRow>
    );
};

const RecommendationList: React.FC<RecommendationListProps> = ({recommendations, pagination, isLoading}) => {
    if (isLoading || recommendations.length) {
        return <Table hint='Readers will see your recommendations in randomized order' isLoading={isLoading} pagination={pagination} hintSeparator>
            {recommendations && recommendations.map(recommendation => <RecommendationItem key={recommendation.id} recommendation={recommendation} />)}
        </Table>;
    } else {
        return <NoValueLabel icon='thumbs-up'>
            No recommendations yet.
        </NoValueLabel>;
    }
};

export default RecommendationList;
