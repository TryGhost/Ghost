import APIKeys from './api-keys';
import IntegrationHeader from './integration-header';
import NiceModal from '@ebay/nice-modal-react';
import {ConfirmationModal, Form, Icon, Modal, Toggle} from '@tryghost/admin-x-design-system';
import {type Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {useBrowseIntegrations} from '@tryghost/admin-x-framework/api/integrations';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRefreshAPIKey} from '@tryghost/admin-x-framework/api/api-keys';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const TransistorModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();
    const {settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const {data: {integrations} = {integrations: []}} = useBrowseIntegrations();

    const {mutateAsync: refreshAPIKey} = useRefreshAPIKey();
    const handleError = useHandleError();
    const [regenerated, setRegenerated] = useState(false);

    const [transistorEnabled] = getSettingValues<boolean>(settings, ['transistor']);
    const [enabled, setEnabled] = useState<boolean>(!!transistorEnabled);
    const [okLabel, setOkLabel] = useState('Save');

    useEffect(() => {
        setEnabled(transistorEnabled || false);
    }, [transistorEnabled]);

    const integration = integrations.find(({slug}) => slug === 'transistor');
    const adminApiKey = integration?.api_keys?.find(key => key.type === 'admin');

    const handleRegenerate = () => {
        if (!integration || !adminApiKey) {
            throw new Error('Transistor integration or Admin API key not found');
        }

        setRegenerated(false);

        NiceModal.show(ConfirmationModal, {
            title: 'Regenerate Admin API Key',
            prompt: 'You will need to update the API key in your Transistor account settings after regenerating.',
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

    const handleSave = async () => {
        const updates: Setting[] = [
            {
                key: 'transistor',
                value: enabled
            }
        ];
        try {
            setOkLabel('Saving...');
            await Promise.all([
                editSettings(updates),
                new Promise((resolve) => {
                    setTimeout(resolve, 1000);
                })
            ]);
            setOkLabel('Saved');
        } catch (e) {
            handleError(e);
        } finally {
            setTimeout(() => setOkLabel('Save'), 1000);
        }
    };

    return (
        <Modal
            afterClose={() => {
                updateRoute('integrations');
            }}
            cancelLabel='Close'
            dirty={enabled !== transistorEnabled}
            okColor={okLabel === 'Saved' ? 'green' : 'black'}
            okLabel={okLabel}
            testId='transistor-modal'
            title=''
            onOk={handleSave}
        >
            <IntegrationHeader
                detail='Podcast hosting platform'
                icon={<Icon name='transistor' size={56} />}
                title='Transistor'
            />
            <div className='mt-7'>
                <Form marginBottom={false} title='Transistor configuration' grouped>
                    <Toggle
                        checked={enabled}
                        direction='rtl'
                        hint={<>Enable <a className='text-green' href="https://transistor.fm" rel="noopener noreferrer" target="_blank">Transistor</a> integration to connect your Ghost site for podcast publishing</>}
                        label='Enable Transistor'
                        onChange={(e) => {
                            setEnabled(e.target.checked);
                        }}
                    />
                    {enabled && (
                        <APIKeys keys={[
                            {
                                label: 'Admin API key',
                                text: adminApiKey?.secret,
                                hint: regenerated ? <div className='text-green'>Admin API Key was successfully regenerated</div> : undefined,
                                onRegenerate: handleRegenerate
                            },
                            {label: 'API URL', text: window.location.origin + getGhostPaths().subdir}
                        ]} />
                    )}
                </Form>
            </div>
        </Modal>
    );
});

export default TransistorModal;
