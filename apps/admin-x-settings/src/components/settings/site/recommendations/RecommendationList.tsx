import Avatar from '../../../../admin-x-ds/global/Avatar';
import Button from '../../../../admin-x-ds/global/Button';
import ConfirmationModal from '../../../../admin-x-ds/global/modal/ConfirmationModal';
import NiceModal from '@ebay/nice-modal-react';
import NoValueLabel from '../../../../admin-x-ds/global/NoValueLabel';
import React from 'react';
import Table from '../../../../admin-x-ds/global/Table';
import TableCell from '../../../../admin-x-ds/global/TableCell';
import TableRow from '../../../../admin-x-ds/global/TableRow';
import useRouting from '../../../../hooks/useRouting';
import {Recommendation, useDeleteRecommendation} from '../../../../api/recommendations';

interface RecommendationListProps {
    recommendations: Recommendation[]
}

const RecommendationItem: React.FC<{recommendation: Recommendation}> = ({recommendation}) => {
    const {updateRoute} = useRouting();
    const {mutateAsync: deleteRecommendation} = useDeleteRecommendation();

    const action = (
        <Button color='red' label='Remove' link onClick={() => {
            NiceModal.show(ConfirmationModal, {
                title: 'Remove recommendation',
                prompt: <>
                    <p>Your recommendation <strong>{recommendation.title}</strong> will no longer be visible to your audience.</p>
                </>,
                okLabel: 'Remove',
                onOk: async (modal) => {
                    await deleteRecommendation(recommendation);
                    modal?.remove();
                }
            });
        }} />
    );

    const showDetails = () => {
        updateRoute({route: `recommendations/${recommendation.id}`});
    };

    return (
        <TableRow action={action} hideActions>
            <TableCell onClick={showDetails}>
                <div className='group flex items-center gap-3 hover:cursor-pointer'>
                    {recommendation.favicon && <Avatar image={recommendation.favicon} labelColor='white' />}
                    <div className={`flex grow flex-col`}>
                        <span className='mb-0.5 font-medium'>{recommendation.title}</span>
                        <span className='text-xs leading-snug text-grey-700'>{recommendation.reason || 'No reason'}</span>
                    </div>
                </div>
            </TableCell>
        </TableRow>
    );
};

const RecommendationList: React.FC<RecommendationListProps> = ({recommendations}) => {
    if (recommendations.length) {
        return <Table hint='Readers will see your recommendations in randomized order' hintSeparator>
            {recommendations.map(recommendation => <RecommendationItem key={recommendation.id} recommendation={recommendation} />)}
        </Table>;
    } else {
        return <NoValueLabel icon='thumbs-up'>
            No recommendations yet.
        </NoValueLabel>;
    }
};

export default RecommendationList;
