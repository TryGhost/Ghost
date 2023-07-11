import Button from '../../../../admin-x-ds/global/Button';
import List from '../../../../admin-x-ds/global/List';
import ListItem from '../../../../admin-x-ds/global/ListItem';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TierDetailModal from './TierDetailModal';
import {Tier} from '../../../../types/api';

interface TiersListProps {
    tab?: string;
    tiers: Tier[];
    updateTiers: (data: Tier[]) => Promise<void>;
}

interface TierActionsProps {
    tier: Tier;
    updateTiers: (data: Tier[]) => Promise<void>;
}

const TierActions: React.FC<TierActionsProps> = ({tier, updateTiers}) => {
    if (tier.active) {
        return (
            <Button color='green' label='Archive' link onClick={() => {
                updateTiers([{...tier, active: false}]);
            }} />
        );
    } else {
        return (
            <Button color='green' label='Activate' link onClick={() => {
                updateTiers([{...tier, active: true}]);
            }}/>
        );
    }
};

const TiersList: React.FC<TiersListProps> = ({
    tiers,
    updateTiers
}) => {
    return (
        <List>
            {tiers.map((tier) => {
                return (
                    <ListItem
                        action={<TierActions tier={tier} updateTiers={updateTiers} />}
                        detail={tier?.description || ''}
                        title={tier?.name}
                        hideActions
                        onClick={() => {
                            NiceModal.show(TierDetailModal);
                        }}
                    />
                );
            })}
        </List>
    );
};

export default TiersList;