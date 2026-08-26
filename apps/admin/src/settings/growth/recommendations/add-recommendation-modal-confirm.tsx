import React from 'react';
import RecommendationDescriptionForm from './recommendation-description-form';
import {validateDescriptionForm} from './recommendation-validation';
import trackEvent from '@/settings/utils/analytics';
import {Button} from '@tryghost/shade/components';
import {type EditOrAddRecommendation, useAddRecommendation} from '@tryghost/admin-x-framework/api/recommendations';
import {LucideIcon} from '@tryghost/shade/utils';
import {SettingsModal} from '@tryghost/shade/patterns';
import {toast} from 'sonner';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';

interface AddRecommendationModalConfirmProps {
    recommendation: EditOrAddRecommendation,
    onBack: (recommendation: EditOrAddRecommendation) => void,
    onClose: () => void,
    onSaved: () => void
}

const AddRecommendationModalConfirm: React.FC<AddRecommendationModalConfirmProps> = ({recommendation, onBack, onClose, onSaved}) => {
    const {mutateAsync: addRecommendation} = useAddRecommendation();
    const handleError = useHandleError();

    const {formState, updateForm, handleSave, saveState, errors, clearError, setErrors} = useForm({
        initialState: {
            ...recommendation
        },
        onSave: async (state) => {
            await addRecommendation(state);
            toast.success('Recommendation added');
            trackEvent('Recommendation Added', {
                oneClickSubscribe: state.one_click_subscribe
            });
            onSaved();
        },
        onSaveError: handleError,
        onValidate: (state) => {
            const newErrors = validateDescriptionForm(state);
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

    const leftButton = (
        <Button size='sm' type='button' variant='ghost' onClick={() => {
            if (saveState === 'saving') {
                // Already saving
                return;
            }

            // Return to the form step, passing along any changes that were already made
            onBack({...formState});
        }}>
            <LucideIcon.ArrowLeft />
            Back
        </Button>
    );

    return <SettingsModal
        animate={false}
        backDropClick={false}
        cancelLabel={'Cancel'}
        dirty={true}
        leftButton={leftButton}
        okLabel={okLabel}
        okLoading={loadingState}
        okVariant='default'
        size='sm'
        testId='add-recommendation-modal'
        title={'Add recommendation'}
        stickyFooter
        onCancel={() => {
            if (saveState === 'saving') {
                // Already saving
                return;
            }
            onClose();
        }}
        onClose={onClose}
        onOk={async () => {
            if (saveState === 'saving') {
                // Already saving
                return;
            }

            toast.dismiss();
            try {
                await handleSave({force: true});
            } catch {
                toast.error('Something went wrong when adding this recommendation, please try again.');
            }
        }}
    >
        <RecommendationDescriptionForm clearError={clearError} errors={errors} formState={formState} setErrors={setErrors} showURL={false} updateForm={updateForm}/>
    </SettingsModal>;
};

export default AddRecommendationModalConfirm;
