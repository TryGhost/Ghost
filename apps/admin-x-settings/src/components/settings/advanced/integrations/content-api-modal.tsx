import APIKeys from './api-keys';
import IntegrationHeader from './integration-header';
import NiceModal from '@ebay/nice-modal-react';
import {Button} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {SettingsModal} from '@tryghost/shade/patterns';
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
        <SettingsModal
            afterClose={() => {
                updateRoute('integrations');
            }}
            cancelLabel=''
            footer={
                <div className='mx-8 flex w-full items-center justify-between'>
                    <Button variant='outline' asChild><a href='https://ghost.org/docs/content-api/' rel='noopener noreferrer' target='_blank'>Open docs <LucideIcon.ExternalLink className='size-3' /></a></Button>
                    <Button type='button' onClick={() => {
                        updateRoute('integrations');
                        modal.remove();
                    }}>Close</Button>
                </div>
            }
            testId='content-api-modal'
            title=''
            stickyFooter
        >
            <IntegrationHeader
                detail='Access your content programmatically'
                icon={<LucideIcon.Code className='size-14' />}
                title='Content API'
            />
            <div className='mt-7'>
                <p className='mb-6 text-grey-700'>This key provides read-only access to your published content. For full read/write access, create a custom integration.</p>
                <APIKeys keys={[
                    {
                        id: 'content-api-key',
                        label: 'Content API key',
                        text: contentApiKey?.secret
                    },
                    {id: 'api-url', label: 'API URL', text: window.location.origin + getGhostPaths().subdir}
                ]} />
            </div>
        </SettingsModal>
    );
});

export default ContentApiModal;
