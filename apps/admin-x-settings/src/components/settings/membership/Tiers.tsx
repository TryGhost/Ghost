import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import StripeButton from '../../../admin-x-ds/settings/StripeButton';
import TabView from '../../../admin-x-ds/global/TabView';
import TiersList from './tiers/TiersList';
import useRouting from '../../../hooks/useRouting';
import {getActiveTiers, getArchivedTiers} from '../../../utils/helpers';
import {useTiers} from '../../providers/ServiceProvider';

const Tiers: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState('active-tiers');
    const {data: tiers, update: updateTier} = useTiers();
    const activeTiers = getActiveTiers(tiers);
    const archivedTiers = getArchivedTiers(tiers);
    const {updateRoute} = useRouting();

    const openConnectModal = () => {
        updateRoute('stripe-connect');
    };

    const tabs = [
        {
            id: 'active-tiers',
            title: 'Active',
            contents: (<TiersList tab='active-tiers' tiers={activeTiers} updateTier={updateTier} />)
        },
        {
            id: 'archived-tiers',
            title: 'Archived',
            contents: (<TiersList tab='archive-tiers' tiers={archivedTiers} updateTier={updateTier} />)
        }
    ];

    return (
        <SettingGroup
            customButtons={<StripeButton onClick={openConnectModal}/>}
            description='Set prices and paid member sign up settings'
            keywords={keywords}
            navid='tiers'
            testId='tiers'
            title='Tiers'
        >
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
        </SettingGroup>
    );
};

export default Tiers;
