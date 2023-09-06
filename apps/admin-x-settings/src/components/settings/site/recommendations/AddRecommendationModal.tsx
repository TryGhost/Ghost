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
import {useExternalGhostSite} from '../../../../api/external-ghost-site';
import {useGetOembed} from '../../../../api/oembed';

interface AddRecommendationModalProps {
    recommendation?: EditOrAddRecommendation,
    animate?: boolean
}

const AddRecommendationModal: React.FC<AddRecommendationModalProps> = ({recommendation, animate}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const {query: queryOembed} = useGetOembed();
    const {query: queryExternalGhostSite} = useExternalGhostSite();

    const {formState, updateForm, handleSave, errors, validate, saveState, clearError} = useForm({
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
            let validatedUrl: URL | null = null;
            try {
                validatedUrl = new URL(formState.url);
            } catch (e) {
                // Ignore
            }

            // First check if it s a Ghost site or not
            let externalGhostSite = validatedUrl && validatedUrl.protocol === 'https:' ? (await queryExternalGhostSite('https://' + validatedUrl.host)) : null;
            let defaultTitle = formState.title;
            if (!defaultTitle) {
                if (validatedUrl) {
                    defaultTitle = validatedUrl.hostname.replace('www.', '');
                } else {
                    // Ignore
                    defaultTitle = formState.url;
                }
            }

            const updatedRecommendation = {
                ...formState,
                title: defaultTitle
            };

            if (externalGhostSite) {
                // For Ghost sites, we use the data from the API
                updatedRecommendation.title = externalGhostSite.site.title || defaultTitle;
                updatedRecommendation.excerpt = externalGhostSite.site.description ?? formState.excerpt ?? null;
                updatedRecommendation.featured_image = externalGhostSite.site.cover_image?.toString() ?? formState.featured_image ?? null;
                updatedRecommendation.favicon = externalGhostSite.site.icon?.toString() ?? externalGhostSite.site.logo?.toString() ?? formState.favicon ?? null;
                updatedRecommendation.one_click_subscribe = externalGhostSite.site.allow_self_signup;
                updatedRecommendation.url = externalGhostSite.site.url.toString();
            } else {
                // For non-Ghost sites, we use the Oemebd API to fetch metadata
                const oembed = await queryOembed({
                    url: formState.url,
                    type: 'mention'
                });
                updatedRecommendation.title = oembed?.metadata?.title ?? defaultTitle;
                updatedRecommendation.excerpt = oembed?.metadata?.description ?? formState.excerpt ?? null;
                updatedRecommendation.featured_image = oembed?.metadata?.thumbnail ?? formState.featured_image ?? null;
                updatedRecommendation.favicon = oembed?.metadata?.icon ?? formState.favicon ?? null;
                updatedRecommendation.one_click_subscribe = false;
            }

            // Switch modal without changing the route (the second modal is not reachable by URL)
            modal.remove();
            NiceModal.show(AddRecommendationModalConfirm, {
                animate: false,
                recommendation: updatedRecommendation
            });
        },
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            try {
                const u = new URL(formState.url);

                // Check domain includes a dot
                if (!u.hostname.includes('.')) {
                    newErrors.url = 'Please enter a valid URL';
                }
            } catch (e) {
                newErrors.url = 'Please enter a valid URL';
            }

            return newErrors;
        }
    });

    let okLabel = 'Next';

    if (saveState === 'saving') {
        okLabel = 'Checking...';
    }

    return <Modal
        afterClose={() => {
            // Closed without saving: reset route
            updateRoute('recommendations');
        }}
        animate={animate ?? true}
        okColor='black'
        okLabel={okLabel}
        size='sm'
        testId='add-recommendation-modal'
        title='Add recommendation'
        onOk={async () => {
            if (saveState === 'saving') {
                // Already saving
                return;
            }

            toast.remove();
            try {
                if (await handleSave({force: true})) {
                    // Already handled
                } else {
                    showToast({
                        type: 'pageError',
                        message: 'One or more fields have errors, please doublecheck you filled all mandatory fields'
                    });
                }
            } catch (e) {
                showToast({
                    type: 'pageError',
                    message: 'Something went wrong while checking this URL, please try again'
                });
            }
        }}
    ><Form
            marginBottom={false}
            marginTop
        >
            <URLTextField
                autoFocus={true}
                error={Boolean(errors.url)}
                hint={errors.url || <>Need inspiration? <a className='text-green' href="https://www.ghost.org/explore" rel="noopener noreferrer" target='_blank'>Explore thousands of sites</a> to recommend</>}
                placeholder='https://www.example.com'
                title='URL'
                value={formState.url}
                onBlur={validate}
                onChange={u => updateForm((state) => {
                    return {
                        ...state,
                        url: u
                    };
                })}
                onKeyDown={() => clearError?.('url')}
            />
        </Form>
    </Modal>;
};

export default NiceModal.create(AddRecommendationModal);
