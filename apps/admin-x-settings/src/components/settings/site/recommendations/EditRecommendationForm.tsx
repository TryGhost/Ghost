import Avatar from '../../../../admin-x-ds/global/Avatar';
import Form from '../../../../admin-x-ds/global/form/Form';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import React from 'react';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';
import useForm from '../../../../hooks/useForm';
import useRouting from '../../../../hooks/useRouting';
import {EditOrAddRecommendation, useAddRecommendation} from '../../../../api/recommendations';
import {showToast} from '../../../../admin-x-ds/global/Toast';
import {toast} from 'react-hot-toast';

interface EditRecommendationFormProps {
    recommendation: EditOrAddRecommendation,
    save: (recommendation: EditOrAddRecommendation) => Promise<void>,
    afterClose?: () => void
}

const EditRecommendationForm: React.FC<EditRecommendationFormProps> = ({recommendation, save, afterClose}) => {
    const {updateRoute} = useRouting();
    const {mutateAsync: addRecommendation} = useAddRecommendation();
    const isNew = !recommendation.id;

    const {formState, updateForm, handleSave, errors, validate, clearError} = useForm({
        initialState: {
            ...recommendation
        },
        onSave: async () => {
            save(formState);
        },
        onValidate: () => {
            const newErrors: Record<string, string> = {};
            return newErrors;
        }
    });

    return <Modal
        afterClose={afterClose}
        animate={!isNew}
        cancelLabel={isNew ? 'Back' : 'Cancel'}
        dirty={isNew}
        okColor='black'
        okLabel={isNew ? 'Add' : 'Save'}
        size='sm'
        testId='add-recommendation-modal'
        title={isNew ? 'Add recommendation' : 'Edit recommendation'}
        onCancel={() => {

        }}
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
    >
        <Form
            marginBottom={false}
            marginTop
        >
            <div className='mb-4 flex items-center gap-3 rounded-sm border border-grey-300 p-3'>
                <Avatar image='https://www.shesabeast.co/content/images/size/w256h256/2022/08/transparent-icon-black-copy-gray-bar.png' labelColor='white' />
                <div className={`flex grow flex-col`}>
                    <span className='mb-0.5 font-medium'>{recommendation.title}</span>
                    <span className='text-xs leading-snug text-grey-700'>{recommendation.url}</span>
                </div>
            </div>
            <TextArea
                clearBg={true}
                rows={3}
                title="Reason for recommending"
                value={formState.reason ?? ''}
                onChange={e => updateForm(state => ({...state, reason: e.target.value}))}
            />
        </Form>
    </Modal>;
};

export default EditRecommendationForm;
