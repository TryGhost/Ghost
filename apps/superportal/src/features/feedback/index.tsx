/**
 * Feedback feature chunk — post "more/less like this" from an email link.
 *
 * Trigger (parsed by the shell hash handler):
 *  - #/feedback/{postId}/{score}/?uuid=&key=
 *
 * Works unauthenticated (keyed by uuid+key) or for a logged-in member; no
 * members dependency.
 */

import {FeedbackModal} from './FeedbackModal';
import feedbackCss from './feedback.css?inline';
import {createApiClientFromSite} from '../../shared/api-client';
import type {FeatureMount} from '../../types';

export const mount: FeatureMount = ({services, params}) => {
    const api = createApiClientFromSite(services.getState().site);
    const score = params?.score === '0' ? 0 : 1;

    const handle = services.openModal(
        <FeedbackModal
            services={services}
            api={api}
            postId={params?.postId ?? ''}
            score={score}
            uuid={params?.uuid || undefined}
            memberKey={params?.key || undefined}
            onClose={() => handle.close()}
        />,
        {css: feedbackCss, panelClass: 'gh-feedback-modal-panel'}
    );
};
