import Button from '../../../admin-x-ds/global/Button';
import List from '../../../admin-x-ds/global/List';
import ListItem from '../../../admin-x-ds/global/ListItem';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import useRouting from '../../../hooks/useRouting';

const Integration: React.FC<{title: string, detail:string, action:() => void}> = ({
    title,
    detail,
    action
}) => {
    return <ListItem
        action={<Button color='green' label='Configure' link onClick={action} />}
        detail={detail}
        title={title}
        hideActions
        onClick={action}
    />;
};

const BuiltInIntegrations: React.FC = () => {
    const {updateRoute} = useRouting();
    const openModal = (modal: string) => {
        updateRoute(modal);
    };

    return (
        <List>
            <Integration action={() => {
                openModal('integrations/zapier');
            }} detail='Automation for your apps' title='Zapier' />

            <Integration action={() => {
                openModal('integrations/slack');
            }} detail='A messaging app for teams' title='Slack' />

            <Integration action={() => {
                openModal('integrations/amp');
            }} detail='Google Accelerated Mobile Pages' title='AMP' />

            <Integration action={() => {
                openModal('integrations/unsplash');
            }} detail='Beautiful, free photos' title='Unsplash' />

            <Integration action={() => {
                openModal('integrations/firstpromoter');
            }} detail='Launch your member referral program' title='FirstPromoter' />

            <Integration action={() => {
                openModal('integrations/pintura');
            }} detail='Advanced image editing' title='Pintura' />
        </List>
    );
};

const CustomIntegrations: React.FC = () => {
    return (
        <List>
            <Integration action={() => {}} detail='Here we go' title='A custom integration' />
        </List>
    );
};

const Integrations: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState<'built-in' | 'custom'>('built-in');

    const tabs = [
        {
            id: 'built-in',
            title: 'Built-in',
            contents: <BuiltInIntegrations />
        },
        {
            id: 'custom',
            title: 'Custom',
            contents: <CustomIntegrations />
        }
    ] as const;

    const buttons = (
        <Button color='green' label='Add custom integration' link={true} onClick={() => {
            // showInviteModal();
        }} />
    );

    return (
        <SettingGroup
            customButtons={buttons}
            description="Make Ghost work with apps and tools"
            keywords={keywords}
            navid='integrations'
            testId='integrations'
            title="Integrations"
        >
            <TabView<'built-in' | 'custom'> selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
        </SettingGroup>
    );
};

export default Integrations;
