import Button from '../../../admin-x-ds/global/Button';
import NewslettersList from './newsletters/NewslettersList';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import useRouting from '../../../hooks/useRouting';

const Newsletters: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openNewsletterModal = () => {
        updateRoute('newsletters/add');
    };
    const [selectedTab, setSelectedTab] = useState('active-newsletters');

    const buttons = (
        <Button color='green' label='Add newsletter' link={true} onClick={() => {
            openNewsletterModal();
        }} />
    );

    const tabs = [
        {
            id: 'active-newsletters',
            title: 'Active',
            contents: (<NewslettersList tab='active-newsletters' />)
        },
        {
            id: 'archived-newsletters',
            title: 'Archived',
            contents: (<NewslettersList tab='archive-newsletters' />)
        }
    ];

    return (
        <SettingGroup
            customButtons={buttons}
            keywords={keywords}
            navid='newsletters'
            testId='newsletters'
            title='Newsletters'
        >
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
        </SettingGroup>
    );
};

export default Newsletters;