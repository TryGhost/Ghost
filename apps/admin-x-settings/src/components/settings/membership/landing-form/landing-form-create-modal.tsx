import * as customFields from '../../../../../../../poc/custom-fields/repo';
import AudiencePicker from './audience-picker';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import {Form, Modal, TextArea, TextField} from '@tryghost/admin-x-design-system';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';

// POC Story 5.5: mirrors the Create newsletter modal (name + description), with
// the Audience picker in place of newsletters' "Opt-in existing subscribers".
// On create it adds the form, then onCreated opens the edit modal to pick fields.
const ALL = 'status:free,status:-free';

interface Props {
    refresh: () => void;
    onCreated?: (form: customFields.LandingForm) => void;
}

const LandingFormCreateModal: React.FC<Props> = ({refresh, onCreated}) => {
    const modal = useModal();
    const handleError = useHandleError();

    const {formState, updateForm, saveState, handleSave, errors, clearError} = useForm({
        initialState: {name: '', description: '', audience: ALL},
        onSave: async () => {
            const created = await customFields.createLandingForm({
                name: formState.name.trim(),
                description: formState.description.trim(),
                audience: formState.audience
            });
            onCreated?.(created);
        },
        onSaveError: handleError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};
            if (!formState.name.trim()) {
                newErrors.name = 'A name is required for your landing form';
            }
            return newErrors;
        }
    });

    return <Modal
        afterClose={refresh}
        backDropClick={false}
        okColor='black'
        okDisabled={saveState === 'saving'}
        okLabel='Create'
        okLoading={saveState === 'saving'}
        size='sm'
        testId='landing-form-create-modal'
        title='Add landing form'
        onOk={async () => {
            if (await handleSave()) {
                modal.remove();
            }
        }}
    >
        <Form marginBottom={false} marginTop>
            <TextField
                autoFocus={true}
                error={Boolean(errors.name)}
                hint={errors.name}
                maxLength={191}
                placeholder='Paid members'
                title='Name'
                value={formState.name}
                onChange={e => updateForm(state => ({...state, name: e.target.value}))}
                onKeyDown={() => clearError('name')}
            />
            <TextArea
                maxLength={2000}
                title='Description'
                value={formState.description}
                onChange={e => updateForm(state => ({...state, description: e.target.value}))}
            />
            <AudiencePicker
                audience={formState.audience}
                onChange={audience => updateForm(state => ({...state, audience}))}
            />
        </Form>
    </Modal>;
};

export default NiceModal.create(LandingFormCreateModal);
