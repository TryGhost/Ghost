import BrandIcon from '../../icons/brand-icon';
import ConfirmationModal from '../../confirmation-modal';
import IntegrationsSettingsImg from '../../../assets/images/integrations-settings.png';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import usePinturaEditor from '../../../hooks/use-pintura-editor';
import {ActionList, ActionListItem, ActionListItemActions, ActionListItemContent, Button, NoValueLabel, NoValueLabelIcon, Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {type Integration, useBrowseIntegrations, useDeleteIntegration} from '@tryghost/admin-x-framework/api/integrations';
import {LucideIcon} from '@tryghost/shade/utils';
import {Plug} from 'lucide-react';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {toast} from 'sonner';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {withErrorBoundary} from '../../error-boundary';

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
        <Button className='text-destructive hover:text-destructive' size='sm' type='button' variant='ghost' onClick={handleDelete}>Delete</Button>
        :
        (disabled ?
            <Button size='sm' type='button' variant='ghost' onClick={handleClick}><LucideIcon.Lock />Upgrade</Button> :
            <Button className='h-auto p-0 font-bold text-green hover:text-green/90 hover:no-underline' size='sm' type='button' variant='link' onClick={handleClick}>Configure</Button>
        );

    return <ActionListItem className={disabled ? 'opacity-50 saturate-0' : ''} data-testid={testId}>
        <ActionListItemContent asChild>
            <button className='flex w-full items-center gap-3 py-3 text-left' type='button' onClick={handleClick}>
                {icon}
                <span className='min-w-0 grow'>
                    <span className='flex items-center gap-1'>
                        {title}
                        {active && <span className='inline-flex items-center rounded-full bg-green/10 px-1.5 py-px text-xs font-semibold tracking-wide text-green uppercase'>Active</span>}
                    </span>
                    <span className='block text-sm text-muted-foreground'>{detail}</span>
                </span>
            </button>
        </ActionListItemContent>
        <ActionListItemActions visibility={disabled ? 'always' : 'hover'}>{buttons}</ActionListItemActions>
    </ActionListItem>;
};

const BuiltInIntegrations: React.FC = () => {
    const {config} = useGlobalData();
    const {updateRoute} = useRouting();

    const openModal = (modal: string) => {
        updateRoute(modal);
    };

    const builtInApiIntegrationsDisabled = config.hostSettings?.limits?.customIntegrations?.disabled;

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
            icon: <BrandIcon name='zapier' size={32} />,
            modal: 'integrations/zapier',
            testId: 'zapier-integration',
            title: 'Zapier'
        },
        {
            active: !!(slackUrl && slackUsername),
            detail: 'A messaging app for teams',
            icon: <BrandIcon name='slack' size={32} />,
            modal: 'integrations/slack',
            testId: 'slack-integration',
            title: 'Slack'
        },
        {
            active: !!unsplashEnabled,
            detail: 'Beautiful, free photos',
            icon: <BrandIcon name='unsplash' size={32} />,
            modal: 'integrations/unsplash',
            testId: 'unsplash-integration',
            title: 'Unsplash'
        },
        {
            active: !!firstPromoterEnabled,
            detail: 'Launch your member referral program',
            icon: <BrandIcon name='firstpromoter' size={32} />,
            modal: 'integrations/firstpromoter',
            testId: 'firstpromoter-integration',
            title: 'FirstPromoter'
        },
        {
            active: pinturaEditor.isEnabled,
            detail: 'Advanced image editing',
            icon: <BrandIcon name='pintura' size={32} />,
            modal: 'integrations/pintura',
            testId: 'pintura-integration',
            title: 'Pintura'
        },
        {
            active: !!transistorEnabled,
            detail: 'Give your members access to private podcasts',
            disabled: builtInApiIntegrationsDisabled,
            icon: <BrandIcon name='transistor' size={32} />,
            modal: 'integrations/transistor',
            testId: 'transistor-integration',
            title: 'Transistor.fm'
        },
        {
            detail: 'Access your content programmatically',
            icon: <LucideIcon.Code className='size-8' />,
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
        <ActionList>
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
        </ActionList>
    );
};

const CustomIntegrations: React.FC<{integrations: Integration[]}> = ({integrations}) => {
    const {updateRoute} = useRouting();
    const {mutateAsync: deleteIntegration} = useDeleteIntegration();
    const handleError = useHandleError();

    if (integrations.length) {
        return (
            <ActionList>
                {integrations.map(integration => (
                    <IntegrationItem
                        key={integration.id}
                        action={() => updateRoute({route: `integrations/${integration.id}`})}
                        detail={<div className="line-clamp-2 break-words">
                            <span title={`${integration.name}: ${integration.description || 'No description'}`}>{integration.description || 'No description'}</span>
                        </div>}
                        icon={
                            integration.icon_image ?
                                <img className='size-8 shrink-0 object-cover' role='presentation' src={integration.icon_image} /> :
                                <LucideIcon.Blocks className='size-6 shrink-0' />
                        }
                        title={integration.name}
                        custom
                        onDelete={() => {
                            NiceModal.show(ConfirmationModal, {
                                title: 'Are you sure?',
                                prompt: 'Deleting this integration will remove all webhooks and api keys associated with it.',
                                okVariant: 'destructive',
                                okLabel: 'Delete Integration',
                                onOk: async (confirmModal) => {
                                    try {
                                        await deleteIntegration(integration.id);
                                        confirmModal?.remove();
                                        toast.info('Integration deleted', {position: 'bottom-left'});
                                    } catch (e) {
                                        handleError(e);
                                    }
                                }
                            });
                        }}
                    />)
                )}
            </ActionList>
        );
    } else {
        return <NoValueLabel>
            <NoValueLabelIcon><Plug /></NoValueLabelIcon>
            No custom integration.
        </NoValueLabel>;
    }
};

const Integrations: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState<'built-in' | 'custom'>('built-in');
    const {data: {integrations} = {integrations: []}} = useBrowseIntegrations();
    const {updateRoute} = useRouting();

    const buttons = (
        <Button
            className='mt-[-5px]'
            size='sm'
            type='button'
            variant='ghost'
            onClick={() => {
                updateRoute('integrations/new');
                setSelectedTab('custom');
            }}
        >Add custom integration</Button>
    );

    return (
        <TopLevelGroup
            customButtons={buttons}
            description='Make Ghost work with apps and tools.'
            headerMedia={
                <div className='-mx-5 overflow-hidden rounded-t-xl border-b border-border-default sm:-mt-5 md:-mx-7 md:-mt-7'>
                    <img className='size-full' src={IntegrationsSettingsImg} />
                </div>
            }
            keywords={keywords}
            navid='integrations'
            testId='integrations'
            title='Integrations'
        >
            <Tabs value={selectedTab} variant='underline' onValueChange={value => setSelectedTab(value as typeof selectedTab)}>
                <TabsList>
                    <TabsTrigger value='built-in'>Built-in</TabsTrigger>
                    <TabsTrigger value='custom'>Custom</TabsTrigger>
                </TabsList>
                <TabsContent value='built-in'><BuiltInIntegrations /></TabsContent>
                <TabsContent value='custom'><CustomIntegrations integrations={integrations.filter(integration => integration.type === 'custom')} /></TabsContent>
            </Tabs>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Integrations, 'Integrations');
