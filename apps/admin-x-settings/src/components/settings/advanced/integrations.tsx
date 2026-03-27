import IntegrationsSettingsImg from '../../../assets/images/integrations-settings.png';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import useFeatureFlag from '../../../hooks/use-feature-flag';
import usePinturaEditor from '../../../hooks/use-pintura-editor';
import {Button, ConfirmationModal, Icon, List, ListItem, NoValueLabel, SettingGroupHeader, TabView, showToast, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {type Integration, useBrowseIntegrations, useDeleteIntegration} from '@tryghost/admin-x-framework/api/integrations';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

interface IntegrationItemProps {
    icon?: React.ReactNode,
    title: string,
    detail: string | React.ReactNode,
    action: () => void;
    onDelete?: () => void;
    active?: boolean;
    disabled?: boolean;
    testId?: string;
    custom?: boolean;
}

interface BuiltInIntegrationItem {
    active?: boolean;
    detail: string;
    disabled?: boolean;
    icon: React.ReactNode;
    modal: string;
    testId: string;
    title: string;
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

    const handleClick = (e?: React.MouseEvent<HTMLElement>) => {
        // Prevent the click event from bubbling up when clicking the delete button
        e?.stopPropagation();

        if (disabled) {
            updateRoute({route: 'pro', isExternal: true});
        } else {
            action();
        }
    };

    const handleDelete = (e?: React.MouseEvent<HTMLElement>) => {
        e?.stopPropagation();
        onDelete?.();
    };

    const buttons = custom ?
        <Button color='red' label='Delete' link onClick={handleDelete} />
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
        title={active ? <span className='inline-flex items-center gap-1'>{title} <span className='inline-flex items-center rounded-full bg-[rgba(48,207,67,0.15)] px-1.5 py-0.5 text-2xs font-semibold tracking-wide text-green uppercase'>Active</span></span> : title}
        onClick={handleClick}
    />;
};

const BuiltInIntegrations: React.FC = () => {
    const {config} = useGlobalData();
    const {updateRoute} = useRouting();

    const openModal = (modal: string) => {
        updateRoute(modal);
    };

    const builtInApiIntegrationsDisabled = config.hostSettings?.limits?.customIntegrations?.disabled;
    const transistorFeatureEnabled = useFeatureFlag('transistor');

    const pinturaEditor = usePinturaEditor();

    const {settings} = useGlobalData();
    const [unsplashEnabled, firstPromoterEnabled, slackUrl, slackUsername, transistorEnabled] = getSettingValues<boolean>(settings, [
        'unsplash',
        'firstpromoter',
        'slack_url',
        'slack_username',
        'transistor'
    ]);

    const items: BuiltInIntegrationItem[] = [
        {
            detail: 'Automation for your apps',
            disabled: builtInApiIntegrationsDisabled,
            icon: <Icon name='zapier' size={32} />,
            modal: 'integrations/zapier',
            testId: 'zapier-integration',
            title: 'Zapier'
        },
        {
            active: !!(slackUrl && slackUsername),
            detail: 'A messaging app for teams',
            icon: <Icon name='slack' size={32} />,
            modal: 'integrations/slack',
            testId: 'slack-integration',
            title: 'Slack'
        },
        {
            active: !!unsplashEnabled,
            detail: 'Beautiful, free photos',
            icon: <Icon name='unsplash' size={32} />,
            modal: 'integrations/unsplash',
            testId: 'unsplash-integration',
            title: 'Unsplash'
        },
        {
            active: !!firstPromoterEnabled,
            detail: 'Launch your member referral program',
            icon: <Icon name='firstpromoter' size={32} />,
            modal: 'integrations/firstpromoter',
            testId: 'firstpromoter-integration',
            title: 'FirstPromoter'
        },
        {
            active: pinturaEditor.isEnabled,
            detail: 'Advanced image editing',
            icon: <Icon name='pintura' size={32} />,
            modal: 'integrations/pintura',
            testId: 'pintura-integration',
            title: 'Pintura'
        },
        ...(transistorFeatureEnabled ? [{
            active: !!transistorEnabled,
            detail: 'Give your members access to private podcasts',
            disabled: builtInApiIntegrationsDisabled,
            icon: <Icon name='transistor' size={32} />,
            modal: 'integrations/transistor',
            testId: 'transistor-integration',
            title: 'Transistor.fm'
        }] : []),
        {
            detail: 'Access your content programmatically',
            icon: <Icon name='angle-brackets' size={32} />,
            modal: 'integrations/contentapi',
            testId: 'content-api-integration',
            title: 'Content API'
        }
    ];

    const sortedItems = [
        ...items.filter(item => !item.disabled),
        ...items.filter(item => item.disabled)
    ];

    return (
        <List titleSeparator={false}>
            {sortedItems.map(item => (
                <IntegrationItem
                    key={item.testId}
                    action={() => {
                        openModal(item.modal);
                    }}
                    active={item.active}
                    detail={item.detail}
                    disabled={item.disabled}
                    icon={item.icon}
                    testId={item.testId}
                    title={item.title}
                />
            ))}
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
                        detail={<div className="line-clamp-2 break-words">
                            <span title={`${integration.name}: ${integration.description || 'No description'}`}>{integration.description || 'No description'}</span>
                        </div>}
                        icon={
                            integration.icon_image ?
                                <img className='size-8 shrink-0 object-cover' role='presentation' src={integration.icon_image} /> :
                                <Icon className='w-8 shrink-0' name='integration' />
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
                                            title: 'Integration deleted',
                                            type: 'info',
                                            options: {
                                                position: 'bottom-left'
                                            }
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
        <Button
            className='mt-[-5px] inline-flex h-7 cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold whitespace-nowrap text-grey-900 transition hover:bg-grey-200 dark:text-white dark:hover:bg-grey-900 [&:hover]:text-black'
            color='clear'
            label='Add custom integration'
            link
            onClick={() => {
                updateRoute('integrations/new');
                setSelectedTab('custom');
            }}
        />
    );

    return (
        <TopLevelGroup
            customButtons={buttons}
            customHeader={
                <div className='sm:-mt-5 md:-mt-7'>
                    <div className='-mx-5 overflow-hidden rounded-t-xl border-b border-grey-200 md:-mx-7 dark:border-grey-800'>
                        <img className='size-full' src={IntegrationsSettingsImg} />
                    </div>
                    <div className=' z-10 mt-6 flex items-start justify-between'>
                        <SettingGroupHeader description='Make Ghost work with apps and tools.' title='Integrations' />
                        {
                            <Button className='mt-[-5px] inline-flex h-7 cursor-pointer items-center justify-center rounded px-3 text-sm font-semibold whitespace-nowrap text-grey-900 transition hover:bg-grey-200 dark:text-white dark:hover:bg-grey-900 [&:hover]:text-black' color='clear' label='Add custom integration' link onClick={() => {
                                updateRoute('integrations/new');
                                setSelectedTab('custom');
                            }} />
                        }
                    </div>
                </div>
            }
            keywords={keywords}
            navid='integrations'
            testId='integrations'
        >
            <TabView<'built-in' | 'custom'> selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Integrations, 'Integrations');
