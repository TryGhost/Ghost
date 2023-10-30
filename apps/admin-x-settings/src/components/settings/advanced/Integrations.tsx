import Button from '../../../admin-x-ds/global/Button';
import ConfirmationModal from '../../../admin-x-ds/global/modal/ConfirmationModal';
import Icon from '../../../admin-x-ds/global/Icon';
import List from '../../../admin-x-ds/global/List';
import ListItem from '../../../admin-x-ds/global/ListItem';
import NiceModal from '@ebay/nice-modal-react';
import NoValueLabel from '../../../admin-x-ds/global/NoValueLabel';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import useHandleError from '../../../utils/api/handleError';
import useRouting from '../../../hooks/useRouting';
import {ReactComponent as AmpIcon} from '../../../assets/icons/amp.svg';
import {ReactComponent as FirstPromoterIcon} from '../../../assets/icons/firstpromoter.svg';
import {Integration, useBrowseIntegrations, useDeleteIntegration} from '../../../api/integrations';
import {ReactComponent as PinturaIcon} from '../../../assets/icons/pintura.svg';
import {ReactComponent as SlackIcon} from '../../../assets/icons/slack.svg';
import {ReactComponent as UnsplashIcon} from '../../../assets/icons/unsplash.svg';
import {ReactComponent as ZapierIcon} from '../../../assets/icons/zapier.svg';
import {getSettingValues} from '../../../api/settings';
import {showToast} from '../../../admin-x-ds/global/Toast';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {withErrorBoundary} from '../../../admin-x-ds/global/ErrorBoundary';

interface IntegrationItemProps {
    icon?: React.ReactNode,
    title: string,
    detail: string,
    action: () => void;
    onDelete?: () => void;
    active?: boolean;
    disabled?: boolean;
    testId?: string;
    custom?: boolean;
}

const IntegrationItem: React.FC<IntegrationItemProps> = ({
    icon,
    title,
    detail,
    action,
    onDelete,
    active,
    disabled,
    testId,
    custom = false
}) => {
    const {updateRoute} = useRouting();

    const handleClick = () => {
        if (disabled) {
            updateRoute({route: 'pro'});
        } else {
            action();
        }
    };

    const buttons = custom ?
        <Button color='red' label='Delete' link onClick={onDelete} />
        :
        (disabled ?
            <Button icon='lock-locked' label='Upgrade' link onClick={handleClick} /> :
            <Button color='green' label='Configure' link onClick={handleClick} />
        );

    return <ListItem
        action={buttons}
        avatar={icon}
        className={disabled ? 'opacity-50 saturate-0' : ''}
        detail={detail}
        hideActions={!disabled}
        testId={testId}
        title={active ? <span className='inline-flex items-center gap-1'>{title} <span className='inline-flex items-center rounded-full bg-[rgba(48,207,67,0.15)] px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wide text-green'>Active</span></span> : title}
        onClick={handleClick}
    />;
};

const BuiltInIntegrations: React.FC = () => {
    const {config} = useGlobalData();
    const {updateRoute} = useRouting();

    const openModal = (modal: string) => {
        updateRoute(modal);
    };

    const zapierDisabled = config.hostSettings?.limits?.customIntegrations?.disabled;

    const {settings} = useGlobalData();
    const [ampEnabled, unsplashEnabled, pinturaEnabled, firstPromoterEnabled, slackUrl, slackUsername] = getSettingValues<boolean>(settings, ['amp', 'unsplash', 'pintura', 'firstpromoter', 'slack_url', 'slack_username']);

    return (
        <List titleSeparator={false}>
            <IntegrationItem
                action={() => {
                    openModal('integrations/zapier');
                }}
                detail='Automation for your apps'
                disabled={zapierDisabled}
                icon={<ZapierIcon className='h-8 w-8' />}
                testId='zapier-integration'
                title='Zapier' />

            <IntegrationItem
                action={() => {
                    openModal('integrations/slack');
                }}
                active={slackUrl && slackUsername}
                detail='A messaging app for teams'
                icon={<SlackIcon className='h-8 w-8' />}
                title='Slack' />

            <IntegrationItem
                action={() => {
                    openModal('integrations/amp');
                }}
                active={ampEnabled}
                detail='Google Accelerated Mobile Pages'
                icon={<AmpIcon className='h-8 w-8' />}
                title='AMP' />

            <IntegrationItem
                action={() => {
                    openModal('integrations/unsplash');
                }}
                active={unsplashEnabled}
                detail='Beautiful, free photos'
                icon={<UnsplashIcon className='h-8 w-8' />}
                title='Unsplash' />

            <IntegrationItem
                action={() => {
                    openModal('integrations/firstpromoter');
                }}
                active={firstPromoterEnabled}
                detail='Launch your member referral program'
                icon={<FirstPromoterIcon className='h-8 w-8' />}
                title='FirstPromoter' />

            <IntegrationItem
                action={() => {
                    openModal('integrations/pintura');
                }}
                active={pinturaEnabled}
                detail='Advanced image editing' icon=
                    {<PinturaIcon className='h-8 w-8' />} title
                    ='Pintura' />
        </List>
    );
};

const CustomIntegrations: React.FC<{integrations: Integration[]}> = ({integrations}) => {
    const {updateRoute} = useRouting();
    const {mutateAsync: deleteIntegration} = useDeleteIntegration();
    const handleError = useHandleError();

    if (integrations.length) {
        return (
            <List borderTop={false}>
                {integrations.map(integration => (
                    <IntegrationItem
                        action={() => updateRoute({route: `integrations/${integration.id}`})}
                        detail={integration.description || 'No description'}
                        icon={
                            integration.icon_image ?
                                <img className='h-8 w-8 object-cover' role='presentation' src={integration.icon_image} /> :
                                <Icon className='w-8' name='integration' />
                        }
                        title={integration.name}
                        custom
                        onDelete={() => {
                            NiceModal.show(ConfirmationModal, {
                                title: 'Are you sure?',
                                prompt: 'Deleting this integration will remove all webhooks and api keys associated with it.',
                                okColor: 'red',
                                okLabel: 'Delete Integration',
                                onOk: async (confirmModal) => {
                                    try {
                                        await deleteIntegration(integration.id);
                                        confirmModal?.remove();
                                        showToast({
                                            message: 'Integration deleted',
                                            type: 'success'
                                        });
                                    } catch (e) {
                                        handleError(e);
                                    }
                                }
                            });
                        }}
                    />)
                )}
            </List>
        );
    } else {
        return <NoValueLabel icon='integration'>
        No custom integration.
        </NoValueLabel>;
    }
};

const Integrations: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState<'built-in' | 'custom'>('built-in');
    const {data: {integrations} = {integrations: []}} = useBrowseIntegrations();
    const {updateRoute} = useRouting();

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
        <Button className='hidden md:!visible md:!block' color='green' label='Add custom integration' link linkWithPadding onClick={() => {
            updateRoute('integrations/new');
            setSelectedTab('custom');
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
            <div className='flex justify-center rounded border border-green px-4 py-2 md:hidden'>
                <Button color='green' label='Add custom integration' link onClick={() => {
                    updateRoute('integrations/new');
                    setSelectedTab('custom');
                }} />
            </div>
            <TabView<'built-in' | 'custom'> selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
        </SettingGroup>
    );
};

export default withErrorBoundary(Integrations, 'Integrations');
