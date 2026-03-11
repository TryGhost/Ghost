import APIKeys from './api-keys';
import IntegrationHeader from './integration-header';
import NiceModal from '@ebay/nice-modal-react';
import {Button, ConfirmationModal, Icon, Modal} from '@tryghost/admin-x-design-system';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useBrowseIntegrations} from '@tryghost/admin-x-framework/api/integrations';
import {useState} from 'react';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRefreshAPIKey} from '@tryghost/admin-x-framework/api/api-keys';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const ContentApiModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();
    const {updateRoute} = useRouting();
    const {data: {integrations} = {integrations: []}} = useBrowseIntegrations();

    const {mutateAsync: refreshAPIKey} = useRefreshAPIKey();
    const handleError = useHandleError();
    const [regenerated, setRegenerated] = useState(false);

    const integration = integrations.find(({slug}) => slug === 'ghost-core-content');
    const contentApiKey = integration?.api_keys?.find(key => key.type === 'content');

    const handleRegenerate = () => {
        if (!integration || !contentApiKey) {
            return;
        }

        setRegenerated(false);

        NiceModal.show(ConfirmationModal, {
            title: 'Regenerate Content API Key',
            prompt: 'Any applications using the current Content API key will need to be updated with the new key.',
            okLabel: 'Regenerate Content API Key',
            onOk: async (confirmModal) => {
                try {
                    await refreshAPIKey({integrationId: integration.id, apiKeyId: contentApiKey.id});
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
                        href='https://ghost.org/docs/content-api/'
                        rel='noopener noreferrer'
                        target='_blank'>
                        Open docs ↗
                    </a>
                    <Button color='outline' label='Close' onClick={() => {
                        updateRoute('integrations');
                        modal.remove();
                    }} />
                </div>
            }
            okColor='black'
            okLabel='Close'
            testId='content-api-modal'
            title=''
            stickyFooter
            onOk={() => {
                updateRoute('integrations');
                modal.remove();
            }}
        >
            <IntegrationHeader
                detail='Access your content programmatically'
                icon={<Icon name='angle-brackets' size={56} />}
                title='Content API'
            />
            <div className='mt-7'>
                <p className='mb-6 text-sm text-grey-700'>This key provides read-only access to your published content. For full read/write access, create a custom integration.</p>
                <APIKeys keys={[
                    {
                        label: 'Content API key',
                        text: contentApiKey?.secret,
                        hint: regenerated ? <div className='text-green'>Content API Key was successfully regenerated</div> : undefined,
                        onRegenerate: handleRegenerate
                    },
                    {label: 'API URL', text: window.location.origin + getGhostPaths().subdir}
                ]} />
            </div>
        </Modal>
    );
});

export default ContentApiModal;
