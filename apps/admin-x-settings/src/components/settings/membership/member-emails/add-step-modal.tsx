import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import {Form, Modal, TextField} from '@tryghost/admin-x-design-system';
import {showToast} from '@tryghost/admin-x-design-system';
import {useAddAutomatedEmail} from '@tryghost/admin-x-framework/api/automated-emails';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';

// Minimal valid empty Lexical document
const EMPTY_LEXICAL = '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

interface AddStepModalProps {
    campaignType: string;
    nextSortOrder: number;
}

const AddStepModal: React.FC<AddStepModalProps> = ({campaignType, nextSortOrder}) => {
    const modal = useModal();
    const {mutateAsync: addAutomatedEmail} = useAddAutomatedEmail();
    const handleError = useHandleError();

    const {formState, updateForm, handleSave, errors, clearError} = useForm({
        initialState: {
            name: '',
            subject: '',
            delay_days: '0'
        },
        onSave: async (state) => {
            await addAutomatedEmail({
                name: state.name,
                subject: state.subject,
                slug: `campaign-step-${campaignType}-${nextSortOrder}`,
                lexical: EMPTY_LEXICAL,
                campaign_type: campaignType,
                delay_days: parseInt(state.delay_days) || 1,
                sort_order: nextSortOrder,
                version: 1,
                status: 'active'
            });
            showToast({type: 'success', title: 'Campaign step added'});
        },
        onSaveError: handleError,
        onValidate: (state) => {
            const newErrors: Record<string, string> = {};
            if (!state.name?.trim()) {
                newErrors.name = 'A name is required';
            }
            if (!state.subject?.trim()) {
                newErrors.subject = 'A subject is required';
            }
            const days = parseInt(state.delay_days);
            if (isNaN(days) || days < 0) {
                newErrors.delay_days = 'Delay must be 0 or more days';
            }
            return newErrors;
        }
    });

    return (
        <Modal
            okColor='black'
            okLabel='Add step'
            size='sm'
            title='Add campaign step'
            formSheet
            onOk={async () => {
                if (await handleSave()) {
                    modal.remove();
                }
            }}
        >
            <div className='mt-5'>
                <Form marginBottom={false} marginTop={false}>
                    <TextField
                        autoFocus={true}
                        error={Boolean(errors.name)}
                        hint={errors.name}
                        placeholder='e.g. Getting started guide'
                        title='Email name'
                        value={formState.name}
                        onChange={e => updateForm(state => ({...state, name: e.target.value}))}
                        onKeyDown={() => clearError('name')}
                    />
                    <TextField
                        error={Boolean(errors.subject)}
                        hint={errors.subject}
                        placeholder='e.g. Here are some tips to get started'
                        title='Email subject'
                        value={formState.subject}
                        onChange={e => updateForm(state => ({...state, subject: e.target.value}))}
                        onKeyDown={() => clearError('subject')}
                    />
                    <TextField
                        error={Boolean(errors.delay_days)}
                        hint={errors.delay_days || 'Number of days after the previous step (0 for immediate)'}
                        title='Delay (days)'
                        type='number'
                        value={formState.delay_days}
                        onChange={e => updateForm(state => ({...state, delay_days: e.target.value}))}
                        onKeyDown={() => clearError('delay_days')}
                    />
                </Form>
            </div>
        </Modal>
    );
};

export default NiceModal.create(AddStepModal);
