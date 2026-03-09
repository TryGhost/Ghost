import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import {Modal, TextField, showToast} from '@tryghost/admin-x-design-system';
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
            delay_days: nextSortOrder === 0 ? '0' : '1'
        },
        onSave: async (state) => {
            await addAutomatedEmail({
                name: state.name,
                subject: state.subject,
                slug: `campaign-step-${campaignType}-${nextSortOrder}`,
                lexical: EMPTY_LEXICAL,
                campaign_type: campaignType,
                delay_days: parseInt(state.delay_days) || 0,
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
                newErrors.name = 'Required';
            }
            if (!state.subject?.trim()) {
                newErrors.subject = 'Required';
            }
            const days = parseInt(state.delay_days);
            if (isNaN(days) || days < 0) {
                newErrors.delay_days = 'Must be 0 or more';
            }
            return newErrors;
        }
    });

    const delayDays = parseInt(formState.delay_days) || 0;
    const delayHint = errors.delay_days || (
        delayDays === 0
            ? 'Sent immediately after previous step'
            : `Sent ${delayDays} ${delayDays === 1 ? 'day' : 'days'} after previous step`
    );

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
            <div className='mt-4 space-y-4'>
                <TextField
                    error={Boolean(errors.name)}
                    hint={errors.name}
                    placeholder='e.g. Getting started guide'
                    title='Name'
                    value={formState.name}
                    autoFocus
                    onChange={e => updateForm(state => ({...state, name: e.target.value}))}
                    onKeyDown={() => clearError('name')}
                />
                <TextField
                    error={Boolean(errors.subject)}
                    hint={errors.subject}
                    placeholder='e.g. Here are some tips to get started'
                    title='Subject line'
                    value={formState.subject}
                    onChange={e => updateForm(state => ({...state, subject: e.target.value}))}
                    onKeyDown={() => clearError('subject')}
                />
                <TextField
                    error={Boolean(errors.delay_days)}
                    hint={delayHint}
                    title='Delay (days)'
                    type='number'
                    value={formState.delay_days}
                    onChange={e => updateForm(state => ({...state, delay_days: e.target.value}))}
                    onKeyDown={() => clearError('delay_days')}
                />
            </div>
        </Modal>
    );
};

export default NiceModal.create(AddStepModal);
