import APIKeys from './api-keys';
import BrandIcon from '../../../icons/brand-icon';
import ConfirmationModal from '../../../confirmation-modal';
import IntegrationHeader from './integration-header';
import NiceModal from '@ebay/nice-modal-react';
import ZapierLogo from '../../../../assets/images/zapier-logo.svg';
import {ActionList, ActionListItem, ActionListItemActions, ActionListItemContent, Button} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {SettingsModal} from '@tryghost/shade/patterns';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useBrowseIntegrations} from '@tryghost/admin-x-framework/api/integrations';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRefreshAPIKey} from '@tryghost/admin-x-framework/api/api-keys';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useSettingsApp} from '../../../providers/settings-app-provider';

export interface ZapierTemplate {
    ghostImage: string;
    appImage: string;
    title: string;
    url: string;
}

const ZapierModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();
    const {updateRoute} = useRouting();
    const {zapierTemplates} = useSettingsApp();
    const {data: {integrations} = {integrations: []}} = useBrowseIntegrations();
    const {config} = useGlobalData();

    const {mutateAsync: refreshAPIKey} = useRefreshAPIKey();
    const handleError = useHandleError();
    const [regenerated, setRegenerated] = useState(false);

    const zapierDisabled = config.hostSettings?.limits?.customIntegrations?.disabled;
    const integration = integrations.find(({slug}) => slug === 'zapier');
    const adminApiKey = integration?.api_keys?.find(key => key.type === 'admin');

    useEffect(() => {
        if (zapierDisabled) {
            updateRoute('integrations');
        }
    }, [zapierDisabled, updateRoute]);

    const handleRegenerate = () => {
        if (!integration || !adminApiKey) {
            return;
        }

        setRegenerated(false);

        NiceModal.show(ConfirmationModal, {
            title: 'Regenerate Admin API Key',
            prompt: 'You will need to locate the Ghost App within your Zapier account and click on "Reconnect" to enter the new Admin API Key.',
            okLabel: 'Regenerate Admin API Key',
            onOk: async (confirmModal) => {
                try {
                    await refreshAPIKey({integrationId: integration.id, apiKeyId: adminApiKey.id});
                    setRegenerated(true);
                    confirmModal?.remove();
                } catch (e) {
                    handleError(e);
                }
            }
        });
    };

    return (
        <SettingsModal
            afterClose={() => {
                updateRoute('integrations');
            }}
            cancelLabel=''
            footer={
                <div className='mx-8 flex w-full items-center justify-between'>
                    <a
                        className='mt-1 self-baseline font-bold'
                        href='https://zapier.com/apps/ghost/integrations?utm_medium=partner_api&utm_source=widget&utm_campaign=Widget'
                        rel='noopener noreferrer'
                        target='_blank'>
                        View more Ghost integrations powered by <span><img alt='Zapier' className='relative top-[-2px] inline-block' src={ZapierLogo} /></span>
                    </a>
                    <Button type='button' onClick={() => {
                        modal.remove();
                    }}>Close</Button>
                </div>
            }
            okLabel='Close'
            okVariant='default'
            testId='zapier-modal'
            title=''
            stickyFooter
            onOk={() => {
                updateRoute('integrations');
                modal.remove();
            }}
        >
            <IntegrationHeader
                detail='Automation for your favorite apps'
                extra={<div className='mt-1 -mb-4'><APIKeys keys={[
                    {
                        id: 'admin-api-key',
                        label: 'Admin API key',
                        text: adminApiKey?.secret,
                        hint: regenerated ? <div className='text-green'>Admin API Key was successfully regenerated</div> : undefined,
                        onRegenerate: handleRegenerate
                    },
                    {id: 'api-url', label: 'API URL', text: window.location.origin + getGhostPaths().subdir}
                ]} /></div>}
                icon={<BrandIcon name='zapier' size={56} />}
                title='Zapier'
            />

            <ActionList>
                {zapierTemplates.map(template => (
                    <ActionListItem key={template.url} hover={false}>
                        <ActionListItemContent className='flex items-center gap-3 py-2 pl-3'>
                            <div className='flex flex-col gap-4 md:flex-row md:items-center'>
                                <div className='flex shrink-0 flex-nowrap items-center gap-2'>
                                    <img className='size-8 object-contain dark:invert' role='presentation' src={template.ghostImage} />
                                    <LucideIcon.ArrowRight className='size-3' />
                                    <img className='size-8 object-contain' role='presentation' src={template.appImage} />
                                </div>
                                <span>{template.title}</span>
                            </div>
                        </ActionListItemContent>
                        <ActionListItemActions visibility='hover'><Button className='h-auto p-0 font-semibold whitespace-nowrap text-[#FF4A00] hover:text-[#FF4A00]' variant='link' asChild><a href={template.url} rel='noopener noreferrer' target='_blank'>Use this Zap</a></Button></ActionListItemActions>
                    </ActionListItem>
                ))}
            </ActionList>
        </SettingsModal>
    );
});

export default ZapierModal;
