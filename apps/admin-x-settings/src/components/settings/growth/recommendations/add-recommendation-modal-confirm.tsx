import AddRecommendationModal from './add-recommendation-modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import RecommendationDescriptionForm, {validateDescriptionForm} from './recommendation-description-form';
import trackEvent from '../../../../utils/analytics';
import {Button} from '@tryghost/shade/components';
import {type EditOrAddRecommendation, useAddRecommendation} from '@tryghost/admin-x-framework/api/recommendations';
import {LucideIcon} from '@tryghost/shade/utils';
import {SettingsModal} from '@tryghost/shade/patterns';
import {toast} from 'sonner';
import {useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';

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
            toast.success('Recommendation added');
            trackEvent('Recommendation Added', {
                oneClickSubscribe: state.one_click_subscribe
            });
            updateRoute('recommendations');
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

            // Switch modal without changing the route, but pass along any changes that were already made
            modal.remove();
            NiceModal.show(AddRecommendationModal, {
                pathName: route,
                animate: false,
                recommendation: {
                    ...formState
                }
            });
        }}>
            <LucideIcon.ArrowLeft />
            Back
        </Button>
    );

    return <SettingsModal
        afterClose={() => {
            // Closed without saving: reset route
            updateRoute('recommendations');
        }}
        animate={animate ?? true}
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
            modal.remove();
            updateRoute('recommendations');
        }}
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

export default NiceModal.create(AddRecommendationModalConfirm);
