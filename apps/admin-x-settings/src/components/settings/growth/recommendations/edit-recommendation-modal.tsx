import ConfirmationModal from '../../../confirmation-modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import RecommendationDescriptionForm, {validateDescriptionForm} from './recommendation-description-form';
import {Button} from '@tryghost/shade/components';
import {type Recommendation, useDeleteRecommendation, useEditRecommendation} from '@tryghost/admin-x-framework/api/recommendations';
import {type RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {SettingsModal} from '@tryghost/shade/patterns';
import {toast} from 'sonner';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';

interface EditRecommendationModalProps {
    recommendation: Recommendation,
    animate?: boolean
}

const EditRecommendationModal: React.FC<RoutingModalProps & EditRecommendationModalProps> = ({recommendation, animate}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const {mutateAsync: editRecommendation} = useEditRecommendation();
    const {mutateAsync: deleteRecommendation} = useDeleteRecommendation();
    const handleError = useHandleError();

    const {formState, updateForm, handleSave, errors, clearError, setErrors, okProps} = useForm({
        initialState: {
            ...recommendation
        },
        savingDelay: 500,
        savedDelay: 500,
        onSave: async (state) => {
            await editRecommendation(state);
        },
        onSaveError: handleError,
        onValidate: (state) => {
            const newErrors = validateDescriptionForm(state);
            return newErrors;
        }
    });

    const leftButton = (
        <Button className='text-destructive hover:text-destructive' size='sm' type='button' variant='ghost' onClick={() => {
            modal.remove();
            NiceModal.show(ConfirmationModal, {
                title: 'Delete recommendation',
                prompt: <>
                    <p>Your recommendation <strong>{recommendation.title}</strong> will no longer be visible to your audience.</p>
                </>,
                okLabel: 'Delete',
                okVariant: 'destructive',
                onOk: async (deleteModal) => {
                    try {
                        await deleteRecommendation(recommendation);
                        deleteModal?.remove();
                    } catch (e) {
                        toast.error('Failed to delete the recommendation', {description: 'Please try again later.'});
                        handleError(e, {withToast: false});
                    }
                }
            });
        }}>Delete</Button>
    );

    return <SettingsModal
        afterClose={() => {
            // Closed without saving: reset route
            updateRoute('recommendations');
        }}
        animate={animate ?? true}
        backDropClick={false}
        buttonsDisabled={okProps.disabled}
        cancelLabel={'Close'}
        leftButton={leftButton}
        okLabel={okProps.label || 'Save'}
        okVariant={okProps.variant}
        size='sm'
        testId='edit-recommendation-modal'
        title={'Edit recommendation'}
        stickyFooter
        onOk={async () => {
            toast.dismiss();
            try {
                await handleSave({force: true});
            } catch {
                toast.error('Something went wrong', {description: 'Please try again later.'});
            }
        }}
    >
        <RecommendationDescriptionForm clearError={clearError} errors={errors} formState={formState} setErrors={setErrors} showURL={true} updateForm={updateForm}/>
    </SettingsModal>;
};

export default NiceModal.create(EditRecommendationModal);
