import ConfirmationModal from '../../../../admin-x-ds/global/modal/ConfirmationModal';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import RecommendationReasonForm from './RecommendationReasonForm';
import handleError from '../../../../utils/handleError';
import useForm from '../../../../hooks/useForm';
import useRouting from '../../../../hooks/useRouting';
import {Recommendation, useBrowseRecommendations, useDeleteRecommendation, useEditRecommendation} from '../../../../api/recommendations';
import {RoutingModalProps} from '../../../providers/RoutingProvider';
import {showToast} from '../../../../admin-x-ds/global/Toast';
import {toast} from 'react-hot-toast';

interface AddRecommendationModalProps {
    recommendation: Recommendation,
    animate?: boolean
}

const EditRecommendationModalConfirm: React.FC<AddRecommendationModalProps> = ({recommendation, animate}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const {mutateAsync: editRecommendation} = useEditRecommendation();
    const {mutateAsync: deleteRecommendation} = useDeleteRecommendation();

    const {formState, updateForm, handleSave, saveState, errors} = useForm({
        initialState: {
            ...recommendation
        },
        onSave: async () => {
            await editRecommendation(formState);
            modal.remove();
            updateRoute('recommendations');
        },
        onSaveError: handleError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};
            if (!formState.title) {
                newErrors.title = 'Title is required';
            }
            return newErrors;
        }
    });

    let okLabel = 'Save';

    if (saveState === 'saving') {
        okLabel = 'Saving...';
    } else if (saveState === 'saved') {
        okLabel = 'Saved';
    }

    let leftButtonProps = {
        label: 'Remove recommendation',
        link: true,
        color: 'red' as const,
        size: 'sm' as const,
        onClick: () => {
            modal.remove();
            NiceModal.show(ConfirmationModal, {
                title: 'Remove recommendation',
                prompt: <>
                    <p>Your recommendation <strong>{recommendation.title}</strong> will no longer be visible to your audience.</p>
                </>,
                okLabel: 'Remove',
                onOk: async (deleteModal) => {
                    try {
                        await deleteRecommendation(recommendation);
                        deleteModal?.remove();
                        showToast({
                            message: 'Successfully removed the recommendation',
                            type: 'success'
                        });
                    } catch (e) {
                        showToast({
                            message: 'Failed to remove the recommendation. Please try again later.',
                            type: 'error'
                        });
                        handleError(e, {withToast: false});
                    }
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
        leftButtonProps={leftButtonProps}
        okColor='black'
        okLabel={okLabel}
        size='sm'
        testId='edit-recommendation-modal'
        title={'Edit recommendation'}
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
                    message: 'One or more fields have errors, please double check that you\'ve filled all mandatory fields.'
                });
            }
        }}
    >
        <RecommendationReasonForm errors={errors} formState={formState} showURL={true} updateForm={updateForm as any}/>
    </Modal>;
};

const EditRecommendationModal: React.FC<RoutingModalProps> = ({params}) => {
    const {data: {recommendations} = {}} = useBrowseRecommendations();
    const recommendation = recommendations?.find(({id}) => id === params?.id);

    if (recommendation) {
        return <EditRecommendationModalConfirm recommendation={recommendation} />;
    } else {
        return null;
    }
};

export default NiceModal.create(EditRecommendationModal);
