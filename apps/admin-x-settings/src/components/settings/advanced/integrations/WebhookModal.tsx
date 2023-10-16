import Form from '../../../../admin-x-ds/global/form/Form';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import Select from '../../../../admin-x-ds/global/form/Select';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import toast from 'react-hot-toast';
import useForm from '../../../../hooks/useForm';
import useHandleError from '../../../../utils/api/handleError';
import validator from 'validator';
import webhookEventOptions from './webhookEventOptions';
import {Webhook, useCreateWebhook, useEditWebhook} from '../../../../api/webhooks';
import {showToast} from '../../../../admin-x-ds/global/Toast';

interface WebhookModalProps {
    webhook?: Webhook;
    integrationId: string;
}

const WebhookModal: React.FC<WebhookModalProps> = ({webhook, integrationId}) => {
    const modal = useModal();
    const {mutateAsync: createWebhook} = useCreateWebhook();
    const {mutateAsync: editWebhook} = useEditWebhook();
    const handleError = useHandleError();

    const {formState, updateForm, handleSave, errors, clearError, validate} = useForm<Partial<Webhook>>({
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
                newErrors.name = 'Please enter a name';
            }

            if (!formState.event) {
                newErrors.event = 'Please select an event';
            }

            if (!formState.target_url) {
                newErrors.target_url = 'Please enter a target URL';
            }

            if (formState.target_url && !validator.isURL(formState.target_url)) {
                newErrors.target_url = 'Please enter a valid URL';
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
            toast.remove();
            if (await handleSave()) {
                modal.remove();
            } else {
                showToast({
                    type: 'pageError',
                    message: 'Can\'t save webhook, please double check that you\'ve filled all mandatory fields.'
                });
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
                    placeholder='Custom webhook'
                    title='Name'
                    value={formState.name}
                    onBlur={validate}
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
                    placeholder='https://example.com'
                    title='Target URL'
                    type='url'
                    value={formState.target_url}
                    onBlur={validate}
                    onChange={e => updateForm(state => ({...state, target_url: e.target.value}))}
                    onKeyDown={() => clearError('target_url')}
                />
                <TextField
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
