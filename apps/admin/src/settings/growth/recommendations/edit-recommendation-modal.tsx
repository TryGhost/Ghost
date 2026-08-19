import React from 'react';
import RecommendationDescriptionForm from './recommendation-description-form';
import {validateDescriptionForm} from './recommendation-validation';
import {Button} from '@tryghost/shade/components';
import {type Recommendation, useDeleteRecommendation, useEditRecommendation} from '@tryghost/admin-x-framework/api/recommendations';
import {SettingsModal} from '@tryghost/shade/patterns';
import {toast} from 'sonner';
import {useConfirmation} from '@/settings/app/components/providers/confirmation-provider';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';

interface EditRecommendationModalProps {
    recommendation: Recommendation,
    onClose: () => void
}

const EditRecommendationModal: React.FC<EditRecommendationModalProps> = ({recommendation, onClose}) => {
    const {mutateAsync: editRecommendation} = useEditRecommendation();
    const {mutateAsync: deleteRecommendation} = useDeleteRecommendation();
    const handleError = useHandleError();
    const {confirm} = useConfirmation();

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
            onClose();
            confirm({
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
        animate={false}
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
        onClose={onClose}
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

export default EditRecommendationModal;
