import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import validator from 'validator';
import webhookEventOptions from './webhook-event-options';
import {Field, FieldError, FieldGroup, FieldLabel, Input, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {SettingsModal} from '@tryghost/shade/patterns';
import {type Webhook, useCreateWebhook, useEditWebhook} from '@tryghost/admin-x-framework/api/webhooks';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';

interface WebhookModalProps {
    webhook?: Webhook;
    integrationId: string;
}

const WebhookModal: React.FC<WebhookModalProps> = ({webhook, integrationId}) => {
    const eventErrorId = React.useId();
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

    return <SettingsModal
        okLabel={webhook ? 'Update' : 'Add'}
        okVariant='default'
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
            <FieldGroup className='gap-8 [&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
                <Field data-invalid={Boolean(errors.name) || undefined}>
                    <FieldLabel htmlFor='webhook-name'>Name</FieldLabel>
                    <Input aria-invalid={Boolean(errors.name) || undefined} id='webhook-name' maxLength={191} placeholder='Custom webhook' value={formState.name ?? ''} onChange={e => updateForm(state => ({...state, name: e.target.value}))} onKeyDown={() => clearError('name')} />
                    {errors.name && <FieldError>{errors.name}</FieldError>}
                </Field>
                <Field data-invalid={Boolean(errors.event) || undefined}>
                    <FieldLabel className='sr-only'>Event</FieldLabel>
                    <Select
                        value={formState.event ?? ''}
                        onValueChange={(value) => {
                            updateForm(state => ({...state, event: value}));
                            clearError('event');
                        }}
                    >
                        <SelectTrigger aria-describedby={errors.event ? eventErrorId : undefined} aria-invalid={Boolean(errors.event) || undefined} aria-label='Event' data-testid='event-select'>
                            <SelectValue placeholder='Select an event' />
                        </SelectTrigger>
                        <SelectContent>
                            {webhookEventOptions.map(group => (
                                <SelectGroup key={group.label}>
                                    <SelectLabel>{group.label}</SelectLabel>
                                    {group.options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                </SelectGroup>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.event && <FieldError id={eventErrorId}>{errors.event}</FieldError>}
                </Field>
                <Field data-invalid={Boolean(errors.target_url) || undefined}>
                    <FieldLabel htmlFor='webhook-target-url'>Target URL</FieldLabel>
                    <Input aria-invalid={Boolean(errors.target_url) || undefined} id='webhook-target-url' maxLength={2000} placeholder='https://example.com' type='url' value={formState.target_url ?? ''} onChange={e => updateForm(state => ({...state, target_url: e.target.value}))} onKeyDown={() => clearError('target_url')} />
                    {errors.target_url && <FieldError>{errors.target_url}</FieldError>}
                </Field>
                <Field>
                    <FieldLabel htmlFor='webhook-secret'>Secret</FieldLabel>
                    <Input id='webhook-secret' maxLength={191} placeholder='https://example.com' value={formState.secret || ''} onChange={e => updateForm(state => ({...state, secret: e.target.value}))} />
                </Field>
            </FieldGroup>
        </div>
    </SettingsModal>;
};

export default NiceModal.create(WebhookModal);
