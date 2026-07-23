import APIKeys from './api-keys';
import ConfirmationModal from '../../../confirmation-modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import WebhooksTable from './webhooks-table';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {type APIKey, useRefreshAPIKey} from '@tryghost/admin-x-framework/api/api-keys';
import {Field, FieldError, FieldGroup, FieldLabel, Input} from '@tryghost/shade/components';
import {ImageUpload, ImageUploadAction, ImageUploadActions, ImageUploadDropzone, ImageUploadImage, ImageUploadPreview} from '@tryghost/shade/patterns';
import {type Integration, useBrowseIntegrations, useEditIntegration} from '@tryghost/admin-x-framework/api/integrations';
import {type RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {SettingsModal} from '@tryghost/shade/patterns';
import {Trash2} from 'lucide-react';
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

    return <SettingsModal
        afterClose={() => {
            updateRoute('integrations');
        }}
        buttonsDisabled={okProps.disabled}
        cancelLabel='Close'
        dirty={saveState === 'unsaved'}
        okLabel={okProps.label || 'Save'}
        okVariant={okProps.variant}
        size='md'
        testId='custom-integration-modal'
        title={formState.name || 'Custom integration'}
        stickyFooter
        onOk={async () => {
            await handleSave({fakeWhenUnchanged: true});
        }}
    >
        <div className='mt-7 flex w-full flex-col gap-7 md:flex-row'>
            <div className='shrink-0'>
                <ImageUpload className='size-25'>
                    {formState.icon_image ? (
                        <ImageUploadPreview>
                            <ImageUploadImage id='custom-integration-icon' src={formState.icon_image} />
                            <ImageUploadActions>
                                <ImageUploadAction aria-label='Remove icon' onClick={() => updateForm(state => ({...state, icon_image: null}))}>
                                    <Trash2 />
                                </ImageUploadAction>
                            </ImageUploadActions>
                        </ImageUploadPreview>
                    ) : (
                        <ImageUploadDropzone className='text-center' inputId='custom-integration-icon' onDropAccepted={async ([file]) => {
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
                        }}>
                            Upload icon
                        </ImageUploadDropzone>
                    )}
                </ImageUpload>
            </div>
            <div className='flex min-w-0 grow flex-col'>
                <FieldGroup className='mb-10 gap-8 [&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
                    <Field data-invalid={Boolean(errors.name) || undefined}>
                        <FieldLabel htmlFor='integration-title'>Title</FieldLabel>
                        <Input aria-invalid={Boolean(errors.name) || undefined} id='integration-title' maxLength={191} value={formState.name} onChange={e => updateForm(state => ({...state, name: e.target.value}))} onKeyDown={() => clearError('name')} />
                        {errors.name && <FieldError>{errors.name}</FieldError>}
                    </Field>
                    <Field>
                        <FieldLabel htmlFor='integration-description'>Description</FieldLabel>
                        <Input id='integration-description' maxLength={2000} value={formState.description || ''} onChange={e => updateForm(state => ({...state, description: e.target.value}))} />
                    </Field>
                    <APIKeys keys={[
                        {
                            id: 'content-api-key',
                            label: 'Content API key',
                            text: contentApiKey?.secret,
                            hint: contentKeyRegenerated ? <div className='text-green'>Content API Key was successfully regenerated</div> : undefined,
                            onRegenerate: () => contentApiKey && handleRegenerate(contentApiKey, setContentKeyRegenerated)
                        },
                        {
                            id: 'admin-api-key',
                            label: 'Admin API key',
                            text: adminApiKey?.secret,
                            hint: adminKeyRegenerated ? <div className='text-green'>Admin API Key was successfully regenerated</div> : undefined,
                            onRegenerate: () => adminApiKey && handleRegenerate(adminApiKey, setAdminKeyRegenerated)
                        },
                        {
                            id: 'api-url',
                            label: 'API URL',
                            text: window.location.origin + getGhostPaths().subdir
                        }
                    ]} />
                </FieldGroup>
            </div>
        </div>

        <div>
            <WebhooksTable integration={integration} />
        </div>
    </SettingsModal>;
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
