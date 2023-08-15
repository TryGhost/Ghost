import Button from '../../../admin-x-ds/global/Button';
import ConfirmationModal from '../../../admin-x-ds/global/modal/ConfirmationModal';
import List from '../../../admin-x-ds/global/List';
import ListItem from '../../../admin-x-ds/global/ListItem';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import useRouting from '../../../hooks/useRouting';
import {ReactComponent as AmpIcon} from '../../../assets/icons/amp.svg';
import {ReactComponent as FirstPromoterIcon} from '../../../assets/icons/firstpromoter.svg';
import {Integration, useBrowseIntegrations, useCreateIntegration, useDeleteIntegration, useEditIntegration} from '../../../api/integrations';
import {ReactComponent as PinturaIcon} from '../../../assets/icons/pintura.svg';
import {ReactComponent as SlackIcon} from '../../../assets/icons/slack.svg';
import {ReactComponent as UnsplashIcon} from '../../../assets/icons/unsplash.svg';
import {ReactComponent as ZapierIcon} from '../../../assets/icons/zapier.svg';
import {useCreateWebhook, useDeleteWebhook, useEditWebhook} from '../../../api/webhooks';

const IntegrationItem: React.FC<{icon?: React.ReactNode, title: string, detail:string, action:() => void}> = ({
    icon,
    title,
    detail,
    action
}) => {
    return <ListItem
        action={<Button color='green' label='Configure' link onClick={action} />}
        avatar={icon}
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
        <List titleSeparator={false}>
            <IntegrationItem
                action={() => {
                    openModal('integrations/zapier');
                }}
                detail='Automation for your apps'
                icon={<ZapierIcon className='h-8 w-8' />}
                title='Zapier' />

            <IntegrationItem
                action={() => {
                    openModal('integrations/slack');
                }}
                detail='A messaging app for teams'
                icon={<SlackIcon className='h-8 w-8' />}
                title='Slack' />

            <IntegrationItem
                action={() => {
                    openModal('integrations/amp');
                }}
                detail='Google Accelerated Mobile Pages'
                icon={<AmpIcon className='h-8 w-8' />}
                title='AMP' />

            <IntegrationItem
                action={() => {
                    openModal('integrations/unsplash');
                }}
                detail='Beautiful, free photos'
                icon={<UnsplashIcon className='h-8 w-8' />}
                title='Unsplash' />

            <IntegrationItem
                action={() => {
                    openModal('integrations/firstpromoter');
                }}
                detail='Launch your member referral program'
                icon={<FirstPromoterIcon className='h-8 w-8' />}
                title='FirstPromoter' />

            <IntegrationItem
                action={() => {
                    openModal('integrations/pintura');
                }}
                detail='Advanced image editing' icon=
                    {<PinturaIcon className='h-8 w-8' />} title
                    ='Pintura' />
        </List>
    );
};

const CustomIntegrations: React.FC<{integrations: Integration[]}> = ({integrations}) => {
    const {mutateAsync: createIntegration} = useCreateIntegration();
    const {mutateAsync: editIntegration} = useEditIntegration();
    const {mutateAsync: deleteIntegration} = useDeleteIntegration();
    const {mutateAsync: createWebhook} = useCreateWebhook();
    const {mutateAsync: editWebhook} = useEditWebhook();
    const {mutateAsync: deleteWebhook} = useDeleteWebhook();

    return (
        <List>
            {integrations.map(integration => (
                <IntegrationItem action={() => {
                    NiceModal.show(ConfirmationModal, {
                        title: 'TEST API actions',
                        prompt: <>
                            Webhooks (will not update until you close and reopen this modal)
                            <pre><code>{JSON.stringify(integration.webhooks)}</code></pre>

                            <Button label='Create integration' onClick={() => createIntegration({name: 'Test'})} />
                            <Button label='Update integration' onClick={() => editIntegration({...integration, name: integration.name + '*'})} />
                            <Button label='Delete integration' onClick={() => deleteIntegration(integration.id)} />
                            <Button label='Create webhook' onClick={() => createWebhook({integration_id: integration.id, event: 'post.edited', name: 'Test', target_url: 'https://test.com'})} />
                            <Button label='Update webhook' onClick={() => editWebhook({...integration.webhooks[0], name: integration.webhooks[0].name + '*'})} />
                            <Button label='Delete webhook' onClick={() => deleteWebhook(integration.webhooks[0].id)} />
                        </>,
                        onOk: modal => modal?.remove()
                    });
                }} detail={integration.description || 'No description'} title={integration.name} />)
            )}
        </List>
    );
};

const Integrations: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState<'built-in' | 'custom'>('built-in');
    const {data: {integrations} = {integrations: []}} = useBrowseIntegrations();

    const tabs = [
        {
            id: 'built-in',
            title: 'Built-in',
            contents: <BuiltInIntegrations />
        },
        {
            id: 'custom',
            title: 'Custom',
            contents: <CustomIntegrations integrations={integrations.filter(integration => integration.type === 'custom')} />
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
