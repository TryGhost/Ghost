import Form from '../../../../admin-x-ds/global/form/Form';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import React from 'react';
import URLTextField from '../../../../admin-x-ds/global/form/URLTextField';
import useForm from '../../../../hooks/useForm';
import {Recommendation} from '../../../../api/recommendations';
import {showToast} from '../../../../admin-x-ds/global/Toast';
import {toast} from 'react-hot-toast';

interface EditUrlFormProps {
    url?: string;
    onConfirm: (recommendation: Partial<Recommendation>) => void;
    afterClose?: () => void
}

const EditUrlForm: React.FC<EditUrlFormProps> = ({url, onConfirm, afterClose}) => {
    const {formState, updateForm, handleSave, errors, validate, clearError} = useForm({
        initialState: {
            url: url ?? ''
        },
        onSave: async () => {
            // Todo: Fetch metadata and pass it along
            onConfirm({
                url: formState.url
            });
        },
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            try {
                new URL(formState.url);
            } catch (e) {
                newErrors.url = 'Please enter a valid URL';
            }

            return newErrors;
        }
    });

    return <Modal
        afterClose={afterClose}
        okColor='black'
        okLabel='Next'
        size='sm'
        testId='add-recommendation-modal'
        title='Add recommendation'
        onOk={async () => {
            toast.remove();
            if (await handleSave()) {
                // Already handled
            } else {
                showToast({
                    type: 'pageError',
                    message: 'One or more fields have errors, please doublecheck you filled all mandatory fields'
                });
            }
        }}
    ><Form
            marginBottom={false}
            marginTop
        >
            <URLTextField
                baseUrl=''
                error={Boolean(errors.url)}
                hint={errors.url || <>Need inspiration? <a className='text-green' href="https://www.ghost.org/explore" rel="noopener noreferrer" target='_blank'>Explore thousands of sites</a> to recommend</>}
                placeholder='https://www.example.com'
                title='URL'
                onBlur={validate}
                onChange={u => updateForm(state => ({...state, url: u}))}
            />
        </Form>
    </Modal>;
};

export default EditUrlForm;
