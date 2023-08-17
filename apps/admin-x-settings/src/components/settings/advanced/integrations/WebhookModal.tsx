import Form from '../../../../admin-x-ds/global/form/Form';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import Select from '../../../../admin-x-ds/global/form/Select';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import useForm from '../../../../hooks/useForm';
import webhookEventOptions from './webhookEventOptions';
import {Webhook, useCreateWebhook, useEditWebhook} from '../../../../api/webhooks';

interface WebhookModalProps {
    webhook?: Webhook
    integrationId: string
}

const WebhookModal: React.FC<WebhookModalProps> = ({webhook, integrationId}) => {
    const modal = useModal();
    const {mutateAsync: createWebhook} = useCreateWebhook();
    const {mutateAsync: editWebhook} = useEditWebhook();

    const {formState, updateForm, handleSave} = useForm<Partial<Webhook>>({
        initialState: webhook || {},
        onSave: async () => {
            if (formState.id) {
                await editWebhook(formState as Webhook);
            } else {
                await createWebhook({...formState, integration_id: integrationId});
            }
            modal.remove();
        }
    });

    return <Modal
        okColor='black'
        okLabel='Add'
        size='sm'
        testId='webhook-modal'
        title='Add webhook'
        formSheet
        onOk={handleSave}
    >
        <div className='mt-5'>
            <Form
                marginBottom={false}
                marginTop={false}
            >
                <TextField
                    placeholder='Custom webhook'
                    title='Name'
                    value={formState.name}
                    onChange={e => updateForm(state => ({...state, name: e.target.value}))}
                />
                <Select
                    options={webhookEventOptions}
                    prompt='Select an event'
                    selectedOption={formState.event}
                    onSelect={event => updateForm(state => ({...state, event}))}
                />
                <TextField
                    placeholder='https://example.com'
                    title='Target URL'
                    value={formState.target_url}
                    onChange={e => updateForm(state => ({...state, target_url: e.target.value}))}
                />
                <TextField
                    placeholder='Psst...'
                    title='Secret'
                    value={formState.secret || undefined}
                    onChange={e => updateForm(state => ({...state, secret: e.target.value}))}
                />
            </Form>
        </div>
    </Modal>;
};

export default NiceModal.create(WebhookModal);
