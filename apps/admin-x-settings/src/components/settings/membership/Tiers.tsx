import Button from '../../../admin-x-ds/global/Button';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import TiersList from './tiers/TiersList';
import useRouting from '../../../hooks/useRouting';

const Tiers: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openTierModal = () => {
        updateRoute('tiers/add');
    };
    const [selectedTab, setSelectedTab] = useState('active-tiers');

    const buttons = (
        <Button color='green' label='Add tier' link={true} onClick={() => {
            openTierModal();
        }} />
    );

    const tabs = [
        {
            id: 'active-tiers',
            title: 'Active',
            contents: (<TiersList tab='active-tiers' />)
        },
        {
            id: 'archived-tiers',
            title: 'Archived',
            contents: (<TiersList tab='archive-tiers' />)
        }
    ];

    return (
        <SettingGroup
            customButtons={buttons}
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
