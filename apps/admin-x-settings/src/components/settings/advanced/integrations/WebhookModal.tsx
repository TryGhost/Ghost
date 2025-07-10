import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import validator from 'validator';
import webhookEventOptions from './webhookEventOptions';
import {Form, Modal, Select, TextField} from '@tryghost/admin-x-design-system';
import {Webhook, useCreateWebhook, useEditWebhook} from '@tryghost/admin-x-framework/api/webhooks';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';

interface WebhookModalProps {
    webhook?: Webhook;
    integrationId: string;
}

const WebhookModal: React.FC<WebhookModalProps> = ({webhook, integrationId}) => {
    const modal = useModal();
    const {mutateAsync: createWebhook} = useCreateWebhook();
    const {mutateAsync: editWebhook} = useEditWebhook();
    const handleError = useHandleError();

    const {formState, updateForm, handleSave, errors, clearError} = useForm<Partial<Webhook>>({
        initialState: webhook || {},
        onSave: async () => {
            if (formState.id) {
                await editWebhook(formState as Webhook);
            } else {
                await createWebhook({...formState, integration_id: integrationId});
            }
        },
        onSaveError: handleError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState.name) {
                newErrors.name = 'Enter a name';
            }

            if (!formState.event) {
                newErrors.event = 'Select an event';
            }

            if (!formState.target_url) {
                newErrors.target_url = 'Enter a target URL';
            }

            if (formState.target_url && !validator.isURL(formState.target_url, {require_tld: false})) {
                newErrors.target_url = 'Enter a valid URL';
            }

            return newErrors;
        }
    });

    return <Modal
        okColor='black'
        okLabel={webhook ? 'Update' : 'Add'}
        size='sm'
        testId='webhook-modal'
        title='Add webhook'
        formSheet
        onOk={async () => {
            if (await handleSave()) {
                modal.remove();
            }
        }}
    >
        <div className='mt-5'>
            <Form
                marginBottom={false}
                marginTop={false}
            >
                <TextField
                    error={Boolean(errors.name)}
                    hint={errors.name}
                    maxLength={191}
                    placeholder='Custom webhook'
                    title='Name'
                    value={formState.name}
                    onChange={e => updateForm(state => ({...state, name: e.target.value}))}
                    onKeyDown={() => clearError('name')}
                />
                <Select
                    error={Boolean(errors.event)}
                    hint={errors.event}
                    options={webhookEventOptions}
                    prompt='Select an event'
                    selectedOption={webhookEventOptions.flatMap(group => group.options).find(option => option.value === formState.event)}
                    testId='event-select'
                    title='Event'
                    hideTitle
                    onSelect={(option) => {
                        updateForm(state => ({...state, event: option?.value}));
                        clearError('event');
                    }}
                />
                <TextField
                    error={Boolean(errors.target_url)}
                    hint={errors.target_url}
                    maxLength={2000}
                    placeholder='https://example.com'
                    title='Target URL'
                    type='url'
                    value={formState.target_url}
                    onChange={e => updateForm(state => ({...state, target_url: e.target.value}))}
                    onKeyDown={() => clearError('target_url')}
                />
                <TextField
                    maxLength={191}
                    placeholder='https://example.com'
                    title='Secret'
                    value={formState.secret || undefined}
                    onChange={e => updateForm(state => ({...state, secret: e.target.value}))}
                />
            </Form>
        </div>
    </Modal>;
};

export default NiceModal.create(WebhookModal);
