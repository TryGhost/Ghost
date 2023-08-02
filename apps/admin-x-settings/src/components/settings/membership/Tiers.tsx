import Button from '../../../admin-x-ds/global/Button';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import StripeButton from '../../../admin-x-ds/settings/StripeButton';
import TabView from '../../../admin-x-ds/global/TabView';
import TiersList from './tiers/TiersList';
import useRouting from '../../../hooks/useRouting';
import {Tier} from '../../../types/api';
import {checkStripeEnabled, getActiveTiers, getArchivedTiers} from '../../../utils/helpers';
import {useGlobalData} from '../../providers/DataProvider';

const Tiers: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState('active-tiers');
    const {tiers, settings, config} = useGlobalData();
    const activeTiers = getActiveTiers(tiers);
    const archivedTiers = getArchivedTiers(tiers);
    const {updateRoute} = useRouting();

    const openConnectModal = () => {
        updateRoute('stripe-connect');
    };

    const sortTiers = (t: Tier[]) => {
        t.sort((a, b) => {
            if ((a.monthly_price as number) < (b.monthly_price as number)) {
                return -1;
            } else {
                return 1;
            }
        });
        return t;
    };

    const tabs = [
        {
            id: 'active-tiers',
            title: 'Active',
            contents: (<TiersList tab='active-tiers' tiers={sortTiers(activeTiers)} />)
        },
        {
            id: 'archived-tiers',
            title: 'Archived',
            contents: (<TiersList tab='archive-tiers' tiers={sortTiers(archivedTiers)} />)
        }
    ];

    let content;
    if (checkStripeEnabled(settings, config)) {
        content = <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />;
    } else {
        content = <TiersList tab='free-tier' tiers={activeTiers.filter(tier => tier.type === 'free')} />;
    }

    return (
        <SettingGroup
            customButtons={checkStripeEnabled(settings, config) ?
                <Button label='Stripe connected' onClick={openConnectModal} /> :
                <StripeButton onClick={openConnectModal}/>}
            description='Set prices and paid member sign up settings'
            keywords={keywords}
            navid='tiers'
            testId='tiers'
            title='Tiers'
        >
            {content}
        </SettingGroup>
    );
};

export default Tiers;
