import AddRecommendationModalConfirm from './AddRecommendationModalConfirm';
import Form from '../../../../admin-x-ds/global/form/Form';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import URLTextField from '../../../../admin-x-ds/global/form/URLTextField';
import useForm from '../../../../hooks/useForm';
import useRouting from '../../../../hooks/useRouting';
import {AlreadyExistsError} from '../../../../utils/errors';
import {EditOrAddRecommendation, RecommendationResponseType, useGetRecommendationByUrl} from '../../../../api/recommendations';
import {RoutingModalProps} from '../../../providers/RoutingProvider';
import {dismissAllToasts, showToast} from '../../../../admin-x-ds/global/Toast';
import {trimSearchAndHash} from '../../../../utils/url';
import {useExternalGhostSite} from '../../../../api/external-ghost-site';
import {useGetOembed} from '../../../../api/oembed';

interface AddRecommendationModalProps {
    recommendation?: EditOrAddRecommendation,
    animate?: boolean
}

const AddRecommendationModal: React.FC<RoutingModalProps & AddRecommendationModalProps> = ({recommendation, animate}) => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const {query: queryOembed} = useGetOembed();
    const {query: queryExternalGhostSite} = useExternalGhostSite();
    const {query: getRecommendationByUrl} = useGetRecommendationByUrl();

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
            let validatedUrl: URL;
            validatedUrl = new URL(formState.url);
            validatedUrl = trimSearchAndHash(validatedUrl);

            // Check if the recommendation already exists
            const {recommendations = []} = await getRecommendationByUrl(validatedUrl) as RecommendationResponseType;
            if (recommendations && recommendations.length > 0) {
                throw new AlreadyExistsError('A recommendation with this URL already exists.');
            }

            // Check if it's a Ghost site or not:
            // 1. Check the full path first. This is the most common use case, and also helps to cover Ghost sites that are hosted on a subdirectory
            // 2. If needed, check the origin. This helps to cover cases where the recommendation URL is a subpage or a post URL of the Ghost site
            let externalGhostSite = null;
            externalGhostSite = await queryExternalGhostSite(validatedUrl.toString());

            if (!externalGhostSite && validatedUrl.pathname !== '' && validatedUrl.pathname !== '/') {
                externalGhostSite = await queryExternalGhostSite(validatedUrl.origin);
            }

            // Use the hostname as fallback title
            const defaultTitle = validatedUrl.hostname.replace('www.', '');

            const updatedRecommendation = {
                ...formState,
                url: validatedUrl.toString()
            };

            if (externalGhostSite) {
                // For Ghost sites, we use the data from the API
                updatedRecommendation.title = externalGhostSite.site.title || defaultTitle;
                updatedRecommendation.excerpt = externalGhostSite.site.description ?? formState.excerpt ?? null;
                updatedRecommendation.featured_image = externalGhostSite.site.cover_image?.toString() ?? formState.featured_image ?? null;
                updatedRecommendation.favicon = externalGhostSite.site.icon?.toString() ?? externalGhostSite.site.logo?.toString() ?? formState.favicon ?? null;
                updatedRecommendation.one_click_subscribe = externalGhostSite.site.allow_external_signup;
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
            updatedRecommendation.reason = updatedRecommendation.excerpt || null;

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
                    newErrors.url = 'Please enter a valid URL.';
                }
            } catch (e) {
                newErrors.url = 'Please enter a valid URL.';
            }

            return newErrors;
        }
    });

    let okLabel = 'Next';
    let loadingState = false;

    if (saveState === 'saving') {
        loadingState = true;
    }

    return <Modal
        afterClose={() => {
            // Closed without saving: reset route
            updateRoute('recommendations');
        }}
        animate={animate ?? true}
        backDropClick={false}
        okColor='black'
        okLabel={okLabel}
        okLoading={loadingState}
        size='sm'
        testId='add-recommendation-modal'
        title='Add recommendation'
        onOk={async () => {
            if (saveState === 'saving') {
                // Already saving
                return;
            }

            dismissAllToasts();
            try {
                await handleSave({force: true});
            } catch (e) {
                const message = e instanceof AlreadyExistsError ? e.message : 'Something went wrong while checking this URL, please try again.';
                showToast({
                    type: 'pageError',
                    message
                });
            }
        }}
    >
        <p className="mt-4">You can recommend any site your audience will find valuable, not just those published on Ghost.</p>
        <Form
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
