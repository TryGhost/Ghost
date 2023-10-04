import AddRecommendationModal from './AddRecommendationModal';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import RecommendationReasonForm from './RecommendationReasonForm';
import useForm from '../../../../hooks/useForm';
import useHandleError from '../../../../utils/api/handleError';
import useRouting from '../../../../hooks/useRouting';
import {EditOrAddRecommendation, useAddRecommendation} from '../../../../api/recommendations';
import {dismissAllToasts, showToast} from '../../../../admin-x-ds/global/Toast';

interface AddRecommendationModalProps {
    recommendation: EditOrAddRecommendation,
    animate?: boolean
}

const AddRecommendationModalConfirm: React.FC<AddRecommendationModalProps> = ({recommendation, animate}) => {
    const modal = useModal();
    const {updateRoute, route} = useRouting();
    const {mutateAsync: addRecommendation} = useAddRecommendation();
    const handleError = useHandleError();

    const {formState, updateForm, handleSave, saveState, errors, clearError} = useForm({
        initialState: {
            ...recommendation
        },
        onSave: async () => {
            await addRecommendation(formState);
            modal.remove();
            showToast({
                message: 'Successfully added a recommendation',
                type: 'success'
            });
            updateRoute('recommendations');
        },
        onSaveError: handleError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};
            if (!formState.title) {
                newErrors.title = 'Title is required';
            }

            if (formState.reason && formState.reason.length > 200) {
                newErrors.reason = 'Description cannot be longer than 200 characters';
            }
            return newErrors;
        }
    });

    let okLabel = 'Add';
    let loadingState = false;

    if (saveState === 'saving') {
        loadingState = true;
    } else if (saveState === 'saved') {
        okLabel = 'Added';
    }

    let leftButtonProps = {
        label: 'Back',
        icon: 'arrow-left',
        iconColorClass: 'text-black dark:text-white',
        link: true,
        size: 'sm' as const,
        onClick: () => {
            if (saveState === 'saving') {
                // Already saving
                return;
            }

            // Switch modal without changing the route, but pass along any changes that were already made
            modal.remove();
            NiceModal.show(AddRecommendationModal, {
                pathName: route,
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
        okLoading={loadingState}
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

            dismissAllToasts();
            try {
                await handleSave({force: true});
            } catch (e) {
                showToast({
                    type: 'pageError',
                    message: 'Something went wrong when adding this recommendation, please try again.'
                });
            }
        }}
    >
        <RecommendationReasonForm clearError={clearError} errors={errors} formState={formState} showURL={false} updateForm={updateForm}/>
    </Modal>;
};

export default NiceModal.create(AddRecommendationModalConfirm);
