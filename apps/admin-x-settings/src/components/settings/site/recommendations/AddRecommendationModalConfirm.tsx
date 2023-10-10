import AddRecommendationModal from './AddRecommendationModal';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import RecommendationDescriptionForm, {validateDescriptionForm} from './RecommendationDescriptionForm';
import trackEvent from '../../../../utils/plausible';
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

    const {formState, updateForm, handleSave, saveState, errors, clearError, setErrors} = useForm({
        initialState: {
            ...recommendation
        },
        onSave: async (state) => {
            await addRecommendation(state);
            modal.remove();
            showToast({
                message: 'Successfully added a recommendation',
                type: 'success'
            });
            trackEvent('Recommendation Added', {
                oneClickSubscribe: state.one_click_subscribe
            });
            updateRoute('recommendations');
        },
        onSaveError: handleError,
        onValidate: (state) => {
            const newErrors = validateDescriptionForm(state);

            if (Object.keys(newErrors).length !== 0) {
                showToast({
                    type: 'pageError',
                    message: 'Can\'t add recommendation, please double check that you\'ve filled all mandatory fields correctly.'
                });
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
        stickyFooter
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
        <RecommendationDescriptionForm clearError={clearError} errors={errors} formState={formState} setErrors={setErrors} showURL={false} updateForm={updateForm}/>
    </Modal>;
};

export default NiceModal.create(AddRecommendationModalConfirm);
