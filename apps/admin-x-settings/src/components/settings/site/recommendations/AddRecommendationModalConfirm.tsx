import AddRecommendationModal from './AddRecommendationModal';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import RecommendationReasonForm from './RecommendationReasonForm';
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

    const {formState, updateForm, handleSave, saveState, errors} = useForm({
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
            if (!formState.title) {
                newErrors.title = 'Title is required';
            }
            return newErrors;
        }
    });

    let okLabel = 'Add';

    if (saveState === 'saving') {
        okLabel = 'Adding...';
    } else if (saveState === 'saved') {
        okLabel = 'Added';
    }

    let leftButtonProps = {
        label: 'Back',
        icon: 'arrow-left',
        size: 'sm' as const,
        onClick: () => {
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
        }
    };

    return <Modal
        afterClose={() => {
            // Closed without saving: reset route
            updateRoute('recommendations');
        }}
        animate={animate ?? true}
        backDropClick={false}
        cancelLabel={'Cancel'}
        dirty={true}
        leftButtonProps={leftButtonProps}
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
            modal.remove();
            updateRoute('recommendations');
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
        <RecommendationReasonForm errors={errors} formState={formState} updateForm={updateForm}/>
    </Modal>;
};

export default NiceModal.create(AddRecommendationModalConfirm);
