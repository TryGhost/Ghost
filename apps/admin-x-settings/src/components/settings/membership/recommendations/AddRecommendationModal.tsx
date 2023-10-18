import AddRecommendationModalConfirm from './AddRecommendationModalConfirm';
import Form from '../../../../admin-x-ds/global/form/Form';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import useForm, {ErrorMessages} from '../../../../hooks/useForm';
import useRouting from '../../../../hooks/useRouting';
import {AlreadyExistsError} from '../../../../utils/errors';
import {EditOrAddRecommendation, RecommendationResponseType, useGetRecommendationByUrl} from '../../../../api/recommendations';
import {LoadingIndicator} from '../../../../admin-x-ds/global/LoadingIndicator';
import {RoutingModalProps} from '../../../providers/RoutingProvider';
import {arePathsEqual, trimSearchAndHash} from '../../../../utils/url';
import {dismissAllToasts, showToast} from '../../../../admin-x-ds/global/Toast';
import {formatUrl} from '../../../../admin-x-ds/global/form/URLTextField';
import {useExternalGhostSite} from '../../../../api/external-ghost-site';
import {useGetOembed} from '../../../../api/oembed';

interface AddRecommendationModalProps {
    recommendation?: EditOrAddRecommendation,
    animate?: boolean
}

const doFormatUrl = (url: string) => {
    return formatUrl(url).save || '';
};

const validateUrl = function (errors: ErrorMessages, url: string) {
    try {
        const u = new URL(url);

        // Check domain includes a dot
        if (!u.hostname.includes('.')) {
            errors.url = 'Please enter a valid URL.';
        } else {
            delete errors.url;
        }
    } catch (e) {
        errors.url = 'Please enter a valid URL.';
    }
    return errors;
};

const AddRecommendationModal: React.FC<RoutingModalProps & AddRecommendationModalProps> = ({searchParams, recommendation, animate}) => {
    const [enterPressed, setEnterPressed] = useState(false);
    const modal = useModal();
    const {updateRoute} = useRouting();
    const {query: queryOembed} = useGetOembed();
    const {query: queryExternalGhostSite} = useExternalGhostSite();
    const {query: getRecommendationByUrl} = useGetRecommendationByUrl();

    // Handle a URL that was passed via the URL
    const initialUrl = recommendation ? '' : (searchParams?.get('url') ?? '');
    const {save: initialUrlCleaned} = initialUrl ? formatUrl(initialUrl) : {save: ''};

    // Show loading view when we had an initial URL
    const didInitialSubmit = React.useRef(false);
    const [showLoadingView, setShowLoadingView] = React.useState(!!initialUrlCleaned);

    const {formState, updateForm, handleSave, errors, saveState, clearError} = useForm({
        initialState: recommendation ?? {
            title: '',
            url: initialUrlCleaned || '',
            description: '',
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
                const existing = recommendations.find(r => arePathsEqual(r.url, validatedUrl.toString()));

                if (existing) {
                    throw new AlreadyExistsError('A recommendation with this URL already exists.');
                }
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
            updatedRecommendation.description = updatedRecommendation.excerpt || null;

            // Switch modal without changing the route (the second modal is not reachable by URL)
            modal.remove();

            // todo: we should change the URL, but this also keeps adding a new modal -> infinite loop
            // updateRoute('recommendations/add?url=' + encodeURIComponent(updatedRecommendation.url));

            NiceModal.show(AddRecommendationModalConfirm, {
                animate: false,
                recommendation: updatedRecommendation
            });
        },
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            validateUrl(newErrors, formState.url);

            // If we have errors: close direct submit view
            if (showLoadingView) {
                setShowLoadingView(Object.keys(newErrors).length === 0);
            }

            return newErrors;
        }
    });

    const onOk = React.useCallback(async () => {
        if (saveState === 'saving') {
            // Already saving
            return;
        }

        dismissAllToasts();
        try {
            if (await handleSave({force: true})) {
                return;
            }
        } catch (e) {
            const message = e instanceof AlreadyExistsError ? e.message : 'Something went wrong while checking this URL, please try again.';
            showToast({
                type: 'pageError',
                message
            });
        }

        // If we have errors: close direct submit view
        if (showLoadingView) {
            setShowLoadingView(false);
        }
    }, [handleSave, saveState, showLoadingView, setShowLoadingView]);

    // Make sure we submit initially when opening in loading view state
    React.useEffect(() => {
        if (showLoadingView && !didInitialSubmit.current) {
            didInitialSubmit.current = true;
            onOk();
        }
    }, [showLoadingView, onOk]);

    useEffect(() => {
        if (enterPressed) {
            onOk();
            setEnterPressed(false); // Reset for future use
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formState]);

    if (showLoadingView) {
        return <Modal
            afterClose={() => {
                // Closed without saving: reset route
                updateRoute('recommendations');
            }}
            animate={animate ?? true}
            backDropClick={false}
            footer={false}
            header={false}
            size='sm'
        >
            <div className="flex flex-col items-center justify-center p-8">
                <LoadingIndicator />
            </div>
        </Modal>;
    }

    return <Modal
        afterClose={() => {
            // Closed without saving: reset route
            updateRoute('recommendations');
        }}
        animate={animate ?? true}
        backDropClick={false}
        okColor='black'
        okLabel={'Next'}
        okLoading={saveState === 'saving'}
        size='sm'
        testId='add-recommendation-modal'
        title='Add recommendation'
        onOk={onOk}
    >
        <p className="mt-4">You can recommend <strong>any site</strong> your audience will find valuable, not just those published on Ghost.</p>
        <Form
            marginBottom={false}
            marginTop
        >
            <TextField
                autoFocus={true}
                error={Boolean(errors.url)}
                hint={errors.url || <>Need inspiration? <a className='text-green' href="https://www.ghost.org/explore" rel="noopener noreferrer" target='_blank'>Explore thousands of sites</a> to recommend</>}
                placeholder='https://www.example.com'
                title='URL'
                value={formState.url}
                onBlur={() => {
                    const url = doFormatUrl(formState.url);
                    updateForm(state => ({...state, url: url}));
                }}
                onChange={(e) => {
                    clearError?.('url');
                    updateForm(state => ({...state, url: e.target.value}));
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        updateForm(state => ({...state, url: doFormatUrl(formState.url)}));
                        setEnterPressed(true);
                    }
                }}
            />
        </Form>
    </Modal>;
};

export default NiceModal.create(AddRecommendationModal);
