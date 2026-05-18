import APIKeys from './api-keys';
import IntegrationHeader from './integration-header';
import NiceModal from '@ebay/nice-modal-react';
import {Button, Icon, Modal} from '@tryghost/admin-x-design-system';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useBrowseIntegrations} from '@tryghost/admin-x-framework/api/integrations';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const ContentApiModal = NiceModal.create(() => {
    const modal = NiceModal.useModal();
    const {updateRoute} = useRouting();
    const {data: {integrations} = {integrations: []}} = useBrowseIntegrations();

    const integration = integrations.find(({slug}) => slug === 'ghost-core-content');
    const contentApiKey = integration?.api_keys?.find(key => key.type === 'content');

    return (
        <Modal
            afterClose={() => {
                updateRoute('integrations');
            }}
            cancelLabel=''
            footer={
                <div className='mx-8 flex w-full items-center justify-between'>
                    <Button color='outline' href='https://ghost.org/docs/content-api/' label={<span className='flex items-center gap-1'>Open docs <Icon name='arrow-top-right' size='xs' /></span>} rel='noopener noreferrer' tag='a' target='_blank' />
                    <Button color='black' label='Close' onClick={() => {
                        updateRoute('integrations');
                        modal.remove();
                    }} />
                </div>
            }
            testId='content-api-modal'
            title=''
            stickyFooter
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
                        text: contentApiKey?.secret
                    },
                    {label: 'API URL', text: window.location.origin + getGhostPaths().subdir}
                ]} />
            </div>
        </Modal>
    );
});

export default ContentApiModal;
