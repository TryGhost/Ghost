import APIKeys from './APIKeys';
import Button from '../../../../admin-x-ds/global/Button';
import ConfirmationModal from '../../../../admin-x-ds/global/modal/ConfirmationModal';
import IntegrationHeader from './IntegrationHeader';
import List from '../../../../admin-x-ds/global/List';
import ListItem from '../../../../admin-x-ds/global/ListItem';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import useRouting from '../../../../hooks/useRouting';
import {ReactComponent as ArrowRightIcon} from '../../../../admin-x-ds/assets/icons/arrow-right.svg';
import {ReactComponent as Icon} from '../../../../assets/icons/zapier.svg';
import {ReactComponent as Logo} from '../../../../assets/images/zapier-logo.svg';
import {getGhostPaths} from '../../../../utils/helpers';
import {useBrowseIntegrations} from '../../../../api/integrations';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useRefreshAPIKey} from '../../../../api/apiKeys';
import {useServices} from '../../../providers/ServiceProvider';

export interface ZapierTemplate {
    ghostImage: string;
    appImage: string;
    title: string;
    url: string;
}

const ZapierModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();
    const {updateRoute} = useRouting();
    const {zapierTemplates} = useServices();
    const {data: {integrations} = {integrations: []}} = useBrowseIntegrations();
    const {config} = useGlobalData();
    const {adminRoot} = getGhostPaths();

    const {mutateAsync: refreshAPIKey} = useRefreshAPIKey();
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
                await refreshAPIKey({integrationId: integration.id, apiKeyId: adminApiKey.id});
                setRegenerated(true);
                confirmModal?.remove();
            }
        });
    };

    return (
        <Modal
            afterClose={() => {
                updateRoute('integrations');
            }}
            cancelLabel=''
            okColor='black'
            okLabel='Close'
            testId='zapier-modal'
            title=''
            onOk={() => {
                modal.remove();
            }}
        >
            <IntegrationHeader
                detail='Automation for your favorite apps'
                extra={<APIKeys keys={[
                    {
                        label: 'Admin API key',
                        text: adminApiKey?.secret,
                        hint: regenerated ? <div className='text-green'>Admin API Key was successfully regenerated</div> : undefined,
                        onRegenerate: handleRegenerate
                    },
                    {label: 'API URL', text: window.location.origin + getGhostPaths().subdir}
                ]} />}
                icon={<Icon className='h-14 w-14' />}
                title='Zapier'
            />

            <List className='mt-6'>
                {zapierTemplates.map(template => (
                    <ListItem
                        action={<Button className='whitespace-nowrap text-sm font-semibold text-[#FF4A00]' href={template.url} label='Use this Zap' tag='a' target='_blank' link unstyled />}
                        avatar={<>
                            <img className='h-8 w-8 object-contain' role='presentation' src={`${adminRoot}${template.ghostImage}`} />
                            <ArrowRightIcon className='h-3 w-3' />
                            <img className='h-8 w-8 object-contain' role='presentation' src={`${adminRoot}${template.appImage}`} />
                        </>}
                        bgOnHover={false}
                        className='flex items-center gap-3 py-2'
                        title={<span className='text-sm'>{template.title}</span>}
                        hideActions
                    />
                ))}
            </List>

            <div className='mt-6 flex'>
                <Button
                    href='https://zapier.com/apps/ghost/integrations?utm_medium=partner_api&utm_source=widget&utm_campaign=Widget'
                    label={<>View more Ghost integrations powered by <Logo className='relative top-[-1px] ml-1 h-6' /></>}
                    rel='noopener noreferrer'
                    tag='a'
                    target='_blank'
                    link
                />
            </div>
        </Modal>
    );
});

export default ZapierModal;
