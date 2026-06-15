/**
 * Recommendations feature chunk — the sites a publisher recommends.
 *
 * Trigger paths (parsed by the shell):
 *  - #/portal/recommendations              → standalone list
 *  - ?action=signup&success=true           → post-signup step (params.fromSignup)
 *
 * Uses a content-API-credentialed client (the list comes from the content API);
 * click/subscribe tracking goes through the members API on the same client.
 */

import {RecommendationsModal} from './RecommendationsModal';
import recommendationsCss from './recommendations.css?inline';
import {createApiClientFromSite} from '../../shared/api-client';
import type {FeatureMount} from '../../types';

export const mount: FeatureMount = ({services, params}) => {
    const site = services.getState().site;
    const fromSignup = params?.fromSignup === 'true';

    // Defensive: standalone trigger on a site without recommendations is a no-op.
    if (!site.recommendations_enabled && !fromSignup) return;

    const api = createApiClientFromSite(site);

    const handle = services.openModal(
        <RecommendationsModal
            services={services}
            api={api}
            fromSignup={fromSignup}
            onClose={() => handle.close()}
        />,
        {css: recommendationsCss, panelClass: 'gh-recommendations-modal-panel'}
    );
};
