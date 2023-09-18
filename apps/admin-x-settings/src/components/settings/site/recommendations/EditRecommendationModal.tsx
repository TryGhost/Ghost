import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import RecommendationReasonForm from './RecommendationReasonForm';
import useForm from '../../../../hooks/useForm';
import useRouting from '../../../../hooks/useRouting';
import {Recommendation, useBrowseRecommendations, useEditRecommendation} from '../../../../api/recommendations';
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

    const {formState, updateForm, handleSave, saveState, errors} = useForm({
        initialState: {
            ...recommendation
        },
        onSave: async () => {
            await editRecommendation(formState);
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

    let okLabel = 'Save';

    if (saveState === 'saving') {
        okLabel = 'Saving...';
    } else if (saveState === 'saved') {
        okLabel = 'Saved';
    }

    return <Modal
        afterClose={() => {
            // Closed without saving: reset route
            updateRoute('recommendations');
        }}
        animate={animate ?? true}
        backDropClick={false}
        cancelLabel={'Cancel'}
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
