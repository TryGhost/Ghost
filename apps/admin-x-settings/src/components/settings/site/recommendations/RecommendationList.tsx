import NoValueLabel from '../../../../admin-x-ds/global/NoValueLabel';
import React from 'react';
import RecommendationIcon from './RecommendationIcon';
import Table from '../../../../admin-x-ds/global/Table';
import TableCell from '../../../../admin-x-ds/global/TableCell';
// import TableHead from '../../../../admin-x-ds/global/TableHead';
import EditRecommendationModal from './EditRecommendationModal';
import NiceModal from '@ebay/nice-modal-react';
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

    const showSubscribes = recommendation.one_click_subscribe && (recommendation.count?.subscribers || recommendation.count?.clicks === 0);
    const count = (showSubscribes ? recommendation.count?.subscribers : recommendation.count?.clicks) || 0;

    return (
        <TableRow>
            <TableCell onClick={showDetails}>
                <div className='group flex items-center gap-3 hover:cursor-pointer'>
                    <div className={`flex grow flex-col`}>
                        <div className="mb-0.5 flex items-center gap-2">
                            <RecommendationIcon showSubscribes={showSubscribes} {...recommendation} />
                            <span className='line-clamp-1 font-medium'>{recommendation.title}</span>
                        </div>
                        <span className='line-clamp-1 text-xs leading-snug text-grey-700'>{recommendation.url || 'No reason added'}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell className='hidden w-1/3 md:!visible md:!table-cell' onClick={showDetails}>
                {(count === 0) ? (<span className="text-grey-500">-</span>) : (<div className='flex grow flex-col'>
                    <span>{count}</span>
                    <span className='whitespace-nowrap text-xs text-grey-700'>{showSubscribes ? ('Subscribers from you') : ('Clicks from you')}</span>
                </div>)}
            </TableCell>
        </TableRow>
    );
};

// TODO: Remove if we decide we don't need headers
// const tableHeader = (<><TableHead>Site</TableHead><TableHead>Conversions from you</TableHead></>);

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
