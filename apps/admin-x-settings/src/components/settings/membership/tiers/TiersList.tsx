import Button from '../../../../admin-x-ds/global/Button';
import List from '../../../../admin-x-ds/global/List';
import ListItem from '../../../../admin-x-ds/global/ListItem';
import NiceModal from '@ebay/nice-modal-react';
import NoValueLabel from '../../../../admin-x-ds/global/NoValueLabel';
import React from 'react';
import TierDetailModal from './TierDetailModal';
import {Tier} from '../../../../types/api';

interface TiersListProps {
    tab?: string;
    tiers: Tier[];
    updateTier: (data: Tier) => Promise<void>;
}

interface TierActionsProps {
    tier: Tier;
    updateTier: (data: Tier) => Promise<void>;
}

const TierActions: React.FC<TierActionsProps> = ({tier, updateTier}) => {
    if (tier.active) {
        return (
            <Button color='red' label='Archive' link onClick={() => {
                updateTier({...tier, active: false});
            }} />
        );
    } else {
        return (
            <Button color='green' label='Activate' link onClick={() => {
                updateTier({...tier, active: true});
            }}/>
        );
    }
};

const TiersList: React.FC<TiersListProps> = ({
    tab,
    tiers,
    updateTier
}) => {
    if (!tiers.length) {
        return (
            <NoValueLabel icon='money-bags'>
                No {tab === 'active-tiers' ? 'active' : 'archived'} tiers found.
            </NoValueLabel>
        );
    }

    return (
        <List borderTop={false}>
            {tiers.map((tier) => {
                return (
                    <ListItem
                        action={<TierActions tier={tier} updateTier={updateTier} />}
                        detail={tier?.description || ''}
                        title={tier?.name}
                        hideActions
                        onClick={() => {
                            NiceModal.show(TierDetailModal, {tier});
                        }}
                    />
                );
            })}
        </List>
    );
};

export default TiersList;
