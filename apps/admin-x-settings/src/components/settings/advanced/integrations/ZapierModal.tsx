import APIKeys from './APIKeys';
import IntegrationHeader from './IntegrationHeader';
import NiceModal from '@ebay/nice-modal-react';
import {Button, ConfirmationModal, Icon, List, ListItem, Modal} from '@tryghost/admin-x-design-system';
import {ReactComponent as Logo} from '../../../../assets/images/zapier-logo.svg';
import {ReactComponent as ZapierIcon} from '../../../../assets/icons/zapier.svg';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {resolveAsset} from '../../../../utils/helpers';
import {useBrowseIntegrations} from '@tryghost/admin-x-framework/api/integrations';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRefreshAPIKey} from '@tryghost/admin-x-framework/api/apiKeys';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useSettingsApp} from '../../../providers/SettingsAppProvider';

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
    const {adminRoot} = getGhostPaths();

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
        <Modal
            afterClose={() => {
                updateRoute('integrations');
            }}
            cancelLabel=''
            footer={
                <div className='mx-8 flex w-full items-center justify-between'>
                    <a
                        className='mt-1 self-baseline text-sm font-bold'
                        href='https://zapier.com/apps/ghost/integrations?utm_medium=partner_api&utm_source=widget&utm_campaign=Widget'
                        rel='noopener noreferrer'
                        target='_blank'>
                        View more Ghost integrations powered by <span><Logo className='relative top-[-2px] inline-block h-6' /></span>
                    </a>
                    <Button color='black' label='Close' onClick={() => {
                        modal.remove();
                    }} />
                </div>
            }
            okColor='black'
            okLabel='Close'
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
                extra={<div className='-mb-4 mt-1'><APIKeys keys={[
                    {
                        label: 'Admin API key',
                        text: adminApiKey?.secret,
                        hint: regenerated ? <div className='text-green'>Admin API Key was successfully regenerated</div> : undefined,
                        onRegenerate: handleRegenerate
                    },
                    {label: 'API URL', text: window.location.origin + getGhostPaths().subdir}
                ]} /></div>}
                icon={<ZapierIcon className='size-14' />}
                title='Zapier'
            />

            <List>
                {zapierTemplates.map(template => (
                    <ListItem
                        action={<Button className='whitespace-nowrap text-sm font-semibold text-[#FF4A00]' href={template.url} label='Use this Zap' tag='a' target='_blank' link unstyled />}
                        bgOnHover={false}
                        className='flex items-center gap-3 py-2 pl-3'
                        title={
                            <div className='flex flex-col gap-4 md:flex-row md:items-center'>
                                <div className='flex shrink-0 flex-nowrap items-center gap-2'>
                                    <img className='size-8 object-contain dark:invert' role='presentation' src={resolveAsset(template.ghostImage, adminRoot)} />
                                    <Icon name="arrow-right" size="xs" />
                                    <img className='size-8 object-contain' role='presentation' src={resolveAsset(template.appImage, adminRoot)} />
                                </div>
                                <span className='text-sm'>{template.title}</span>
                            </div>
                        }
                        hideActions
                    />
                ))}
            </List>
        </Modal>
    );
});

export default ZapierModal;
