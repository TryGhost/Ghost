import APIKeys from './APIKeys';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import WebhooksTable from './WebhooksTable';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {APIKey, useRefreshAPIKey} from '@tryghost/admin-x-framework/api/apiKeys';
import {ConfirmationModal, Form, ImageUpload, Modal, TextField} from '@tryghost/admin-x-design-system';
import {Integration, useBrowseIntegrations, useEditIntegration} from '@tryghost/admin-x-framework/api/integrations';
import {RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';

const CustomIntegrationModalContent: React.FC<{integration: Integration}> = ({integration}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();

    const {mutateAsync: editIntegration} = useEditIntegration();
    const {mutateAsync: refreshAPIKey} = useRefreshAPIKey();
    const {mutateAsync: uploadImage} = useUploadImage();
    const handleError = useHandleError();

    const {formState, updateForm, handleSave, saveState, errors, clearError, okProps} = useForm({
        initialState: integration,
        savingDelay: 500,
        savedDelay: 500,
        onSave: async () => {
            await editIntegration(formState);
        },
        onSavedStateReset: () => {
            updateRoute('integrations');
        },
        onSaveError: handleError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState.name) {
                newErrors.name = 'Enter integration title';
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
        buttonsDisabled={okProps.disabled}
        cancelLabel='Close'
        dirty={saveState === 'unsaved'}
        okColor={okProps.color}
        okLabel={okProps.label || 'Save'}
        size='md'
        testId='custom-integration-modal'
        title={formState.name || 'Custom integration'}
        stickyFooter
        onOk={async () => {
            await handleSave({fakeWhenUnchanged: true});
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
                            const error = e as APIError;
                            if (error.response!.status === 415) {
                                error.message = 'Unsupported file type';
                            }
                            handleError(error);
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
                        maxLength={191}
                        title='Title'
                        value={formState.name}
                        onChange={e => updateForm(state => ({...state, name: e.target.value}))}
                        onKeyDown={() => clearError('name')}
                    />
                    <TextField maxLength={2000} title='Description' value={formState.description || ''} onChange={e => updateForm(state => ({...state, description: e.target.value}))} />
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
