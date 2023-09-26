import APIKeys from './APIKeys';
import ConfirmationModal from '../../../../admin-x-ds/global/modal/ConfirmationModal';
import Form from '../../../../admin-x-ds/global/form/Form';
import ImageUpload from '../../../../admin-x-ds/global/form/ImageUpload';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import WebhooksTable from './WebhooksTable';
import useForm from '../../../../hooks/useForm';
import useHandleError from '../../../../utils/api/handleError';
import useRouting from '../../../../hooks/useRouting';
import {APIKey, useRefreshAPIKey} from '../../../../api/apiKeys';
import {Integration, useBrowseIntegrations, useEditIntegration} from '../../../../api/integrations';
import {RoutingModalProps} from '../../../providers/RoutingProvider';
import {getGhostPaths} from '../../../../utils/helpers';
import {getImageUrl, useUploadImage} from '../../../../api/images';
import {showToast} from '../../../../admin-x-ds/global/Toast';
import {toast} from 'react-hot-toast';

const CustomIntegrationModalContent: React.FC<{integration: Integration}> = ({integration}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();

    const {mutateAsync: editIntegration} = useEditIntegration();
    const {mutateAsync: refreshAPIKey} = useRefreshAPIKey();
    const {mutateAsync: uploadImage} = useUploadImage();
    const handleError = useHandleError();

    const {formState, updateForm, handleSave, saveState, errors, clearError, validate} = useForm({
        initialState: integration,
        onSave: async () => {
            await editIntegration(formState);
        },
        onSaveError: handleError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState.name) {
                newErrors.name = 'Please enter a name';
            }

            return newErrors;
        }
    });

    const adminApiKey = integration.api_keys?.find(key => key.type === 'admin');
    const contentApiKey = integration.api_keys?.find(key => key.type === 'content');

    const [adminKeyRegenerated, setAdminKeyRegenerated] = useState(false);
    const [contentKeyRegenerated, setContentKeyRegenerated] = useState(false);

    useEffect(() => {
        if (integration.type !== 'custom') {
            modal.remove();
            updateRoute('integrations');
        }
    }, [integration.type, modal, updateRoute]);

    const handleRegenerate = (apiKey: APIKey, setRegenerated: (value: boolean) => void) => {
        setRegenerated(false);

        const name = apiKey.type === 'content' ? 'Content' : 'Admin';

        NiceModal.show(ConfirmationModal, {
            title: `Regenerate ${name} API Key`,
            prompt: `You can regenerate ${name} API Key any time, but any scripts or applications using it will need to be updated.`,
            okLabel: `Regenerate ${name} API Key`,
            onOk: async (confirmModal) => {
                try {
                    await refreshAPIKey({integrationId: integration.id, apiKeyId: apiKey.id});
                    setRegenerated(true);
                    confirmModal?.remove();
                } catch (e) {
                    handleError(e);
                }
            }
        });
    };

    return <Modal
        afterClose={() => {
            updateRoute('integrations');
        }}
        dirty={saveState === 'unsaved'}
        okColor='black'
        okLabel='Save & close'
        size='md'
        testId='custom-integration-modal'
        title={formState.name}
        stickyFooter
        onOk={async () => {
            toast.remove();
            if (await handleSave()) {
                modal.remove();
                updateRoute('integrations');
            } else {
                showToast({
                    type: 'pageError',
                    message: 'Can\'t save integration, please double check that you\'ve filled all mandatory fields.'
                });
            }
        }}
    >
        <div className='mt-7 flex w-full flex-col gap-7 md:flex-row'>
            <div>
                <ImageUpload
                    height='100px'
                    id='custom-integration-icon'
                    imageURL={formState.icon_image || undefined}
                    width='100px'
                    onDelete={() => updateForm(state => ({...state, icon_image: null}))}
                    onUpload={async (file) => {
                        try {
                            const imageUrl = getImageUrl(await uploadImage({file}));
                            updateForm(state => ({...state, icon_image: imageUrl}));
                        } catch (e) {
                            handleError(e);
                        }
                    }}
                >
                    Upload icon
                </ImageUpload>
            </div>
            <div className='flex grow flex-col'>
                <Form>
                    <TextField
                        error={Boolean(errors.name)}
                        hint={errors.name}
                        title='Title'
                        value={formState.name}
                        onBlur={validate}
                        onChange={e => updateForm(state => ({...state, name: e.target.value}))}
                        onKeyDown={() => clearError('name')}
                    />
                    <TextField title='Description' value={formState.description || ''} onChange={e => updateForm(state => ({...state, description: e.target.value}))} />
                    <APIKeys keys={[
                        {
                            label: 'Content API key',
                            text: contentApiKey?.secret,
                            hint: contentKeyRegenerated ? <div className='text-green'>Content API Key was successfully regenerated</div> : undefined,
                            onRegenerate: () => contentApiKey && handleRegenerate(contentApiKey, setContentKeyRegenerated)
                        },
                        {
                            label: 'Admin API key',
                            text: adminApiKey?.secret,
                            hint: adminKeyRegenerated ? <div className='text-green'>Admin API Key was successfully regenerated</div> : undefined,
                            onRegenerate: () => adminApiKey && handleRegenerate(adminApiKey, setAdminKeyRegenerated)
                        },
                        {
                            label: 'API URL',
                            text: window.location.origin + getGhostPaths().subdir
                        }
                    ]} />
                </Form>
            </div>
        </div>

        <div>
            <WebhooksTable integration={integration} />
        </div>
    </Modal>;
};

const CustomIntegrationModal: React.FC<RoutingModalProps> = ({params}) => {
    const {data: {integrations} = {}} = useBrowseIntegrations();
    const integration = integrations?.find(({id}) => id === params?.id);

    if (integration) {
        return <CustomIntegrationModalContent integration={integration} />;
    } else {
        return null;
    }
};

export default NiceModal.create(CustomIntegrationModal);
