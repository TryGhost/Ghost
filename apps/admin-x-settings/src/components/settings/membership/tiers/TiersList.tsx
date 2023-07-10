import Button from '../../../../admin-x-ds/global/Button';
import List from '../../../../admin-x-ds/global/List';
import ListItem from '../../../../admin-x-ds/global/ListItem';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TierDetailModal from './TierDetailModal';

interface TiersListProps {
    tab?: string;
}

const TiersList: React.FC<TiersListProps> = ({
    tab
}) => {
    const action = tab === 'active-tiers' ? (
        <Button color='green' label='Archive' link />
    ) : (
        <Button color='green' label='Activate' link />
    );

    return (
        <List>
            <ListItem
                action={action}
                detail='Yet another tier'
                title='Tier one'
                hideActions
                onClick={() => {
                    NiceModal.show(TierDetailModal);
                }}
            />
            <ListItem
                action={action}
                detail='Yet another tier again'
                title='Tier two'
                hideActions
                onClick={() => {
                    NiceModal.show(TierDetailModal);
                }}
            />
        </List>
    );
};

export default TiersList;