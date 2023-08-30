import Button from '../../../../admin-x-ds/global/Button';
import NoValueLabel from '../../../../admin-x-ds/global/NoValueLabel';
import React from 'react';
import Table from '../../../../admin-x-ds/global/Table';
import TableCell from '../../../../admin-x-ds/global/TableCell';
import TableRow from '../../../../admin-x-ds/global/TableRow';
import {Recommendation} from '../../../../api/recommendations';

interface RecommendationListProps {
    recommendations: Recommendation[]
}

const RecommendationItem: React.FC<{recommendation: Recommendation}> = ({recommendation}) => {
    const action = <Button color='green' label='Delete' link onClick={() => {}} />;

    const showDetails = () => {};

    return (
        <TableRow action={action} hideActions>
            <TableCell onClick={showDetails}>
                <div className={`flex grow flex-col`}>
                    <span className='font-medium'>{recommendation.title}</span>
                    <span className='whitespace-nowrap text-xs text-grey-700'>{recommendation.reason || 'No description'}</span>
                </div>
            </TableCell>
        </TableRow>
    );
};

const RecommendationList: React.FC<RecommendationListProps> = ({recommendations}) => {
    if (recommendations.length) {
        return <Table>
            {recommendations.map(recommendation => <RecommendationItem key={recommendation.id} recommendation={recommendation} />)}
        </Table>;
    } else {
        return <NoValueLabel icon='mail-block'>
            No recommendations found.
        </NoValueLabel>;
    }
};

export default RecommendationList;
