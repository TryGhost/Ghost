import AddRecommendationModalConfirm from './AddRecommendationModalConfirm';
import Form from '../../../../admin-x-ds/global/form/Form';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import URLTextField from '../../../../admin-x-ds/global/form/URLTextField';
import useForm from '../../../../hooks/useForm';
import useRouting from '../../../../hooks/useRouting';
import {EditOrAddRecommendation} from '../../../../api/recommendations';
import {showToast} from '../../../../admin-x-ds/global/Toast';
import {toast} from 'react-hot-toast';
import {useGetOembed} from '../../../../api/oembed';

interface AddRecommendationModalProps {
    recommendation?: EditOrAddRecommendation
}

const AddRecommendationModal: React.FC<AddRecommendationModalProps> = ({recommendation}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const {query: queryOembed} = useGetOembed();

    const {formState, updateForm, handleSave, errors, validate, clearError} = useForm({
        initialState: recommendation ?? {
            title: '',
            url: '',
            reason: '',
            excerpt: null,
            featured_image: null,
            favicon: null,
            one_click_subscribe: false
        },
        onSave: async () => {
            // Todo: Fetch metadata and pass it along
            const oembed = await queryOembed({
                url: formState.url,
                type: 'mention'
            });

            if (!oembed) {
                showToast({
                    type: 'pageError',
                    message: 'Could not fetch metadata for this URL, please try again later'
                });
                return;
            }

            // Switch modal without changing the route (the second modal is not reachable by URL)
            modal.remove();
            NiceModal.show(AddRecommendationModalConfirm, {
                recommendation: {
                    ...formState,
                    title: oembed.metadata.title ?? formState.title,
                    excerpt: oembed.metadata.description ?? formState.excerpt,
                    featured_image: oembed.metadata.thumbnail ?? formState.featured_image,
                    favicon: oembed.metadata.icon ?? formState.favicon
                }
            });
        },
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            try {
                new URL(formState.url);
            } catch (e) {
                newErrors.url = 'Please enter a valid URL';
            }

            return newErrors;
        }
    });

    return <Modal
        afterClose={() => {
            // Closed without saving: reset route
            updateRoute('recommendations');
        }}
        okColor='black'
        okLabel='Next'
        size='sm'
        testId='add-recommendation-modal'
        title='Add recommendation'
        onOk={async () => {
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
    ><Form
            marginBottom={false}
            marginTop
        >
            <URLTextField
                baseUrl=''
                error={Boolean(errors.url)}
                hint={errors.url || <>Need inspiration? <a className='text-green' href="https://www.ghost.org/explore" rel="noopener noreferrer" target='_blank'>Explore thousands of sites</a> to recommend</>}
                placeholder='https://www.example.com'
                title='URL'
                value={formState.url}
                onBlur={validate}
                onChange={u => updateForm(state => ({...state, url: u}))}
            />
        </Form>
    </Modal>;
};

export default NiceModal.create(AddRecommendationModal);
