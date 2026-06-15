/**
 * Donations feature chunk — tips & one-time donations.
 *
 * Like Portal, the donate path is redirect-only (amount + note are entered on
 * Stripe). Triggers (parsed by the shell):
 *  - data-portal="support"        → donate (checkout + redirect)
 *  - #/portal/support             → donate
 *  - #/portal/support/success     → success view (logged-out return)
 *  - #/portal/support/error       → error view
 *
 * Enablement mirrors offers/gift: Stripe-gated server-side (donations_enabled),
 * not an independent toggle.
 */

import {SupportModal, type SupportView} from './SupportModal';
import donationsCss from './donations.css?inline';
import {createApiClientFromSite} from '../../shared/api-client';
import type {FeatureMount} from '../../types';

export const mount: FeatureMount = ({services, params}) => {
    const api = createApiClientFromSite(services.getState().site);
    const action = params?.action ?? 'donate';
    const initialView: SupportView = action === 'success' ? 'success' : action === 'error' ? 'error' : 'loading';

    const handle = services.openModal(
        <SupportModal
            services={services}
            api={api}
            initialView={initialView}
            onClose={() => handle.close()}
        />,
        {css: donationsCss, panelClass: 'gh-donations-modal-panel'}
    );
};
