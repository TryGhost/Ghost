import AddRecommendationModal from './AddRecommendationModal';
import Avatar from '../../../../admin-x-ds/global/Avatar';
import Form from '../../../../admin-x-ds/global/form/Form';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';
import useForm from '../../../../hooks/useForm';
import useRouting from '../../../../hooks/useRouting';
import {EditOrAddRecommendation, useAddRecommendation} from '../../../../api/recommendations';
import {showToast} from '../../../../admin-x-ds/global/Toast';
import {toast} from 'react-hot-toast';

interface AddRecommendationModalProps {
    recommendation: EditOrAddRecommendation,
    animate?: boolean
}

const AddRecommendationModalConfirm: React.FC<AddRecommendationModalProps> = ({recommendation, animate}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const {mutateAsync: addRecommendation} = useAddRecommendation();

    const {formState, updateForm, handleSave, saveState} = useForm({
        initialState: {
            ...recommendation
        },
        onSave: async () => {
            await addRecommendation(formState);
            modal.remove();
            updateRoute('recommendations');
        },
        onValidate: () => {
            const newErrors: Record<string, string> = {};
            return newErrors;
        }
    });

    let okLabel = 'Add';

    if (saveState === 'saving') {
        okLabel = 'Adding...';
    } else if (saveState === 'saved') {
        okLabel = 'Added';
    }

    return <Modal
        afterClose={() => {
            // Closed without saving: reset route
            updateRoute('recommendations');
        }}
        animate={animate ?? true}
        cancelLabel={'Back'}
        dirty={true}
        okColor='black'
        okLabel={okLabel}
        size='sm'
        testId='add-recommendation-modal'
        title={'Add recommendation'}
        onCancel={() => {
            if (saveState === 'saving') {
                // Already saving
                return;
            }
            // Switch modal without changing the route, but pass along any changes that were already made
            modal.remove();
            NiceModal.show(AddRecommendationModal, {
                animate: false,
                recommendation: {
                    ...formState
                }
            });
        }}
        onOk={async () => {
            if (saveState === 'saving') {
                // Already saving
                return;
            }

            toast.remove();
            if (await handleSave({force: true})) {
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
                {(recommendation.favicon || recommendation.featured_image) && <Avatar image={recommendation.favicon ?? recommendation.featured_image} labelColor='white' />}
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

export default NiceModal.create(AddRecommendationModalConfirm);
