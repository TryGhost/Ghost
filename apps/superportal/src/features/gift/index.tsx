/**
 * Gift feature chunk — purchase, redemption, and post-checkout success flows.
 *
 * Trigger paths:
 *  - data-portal="gift" / #/portal/gift          → purchase view
 *  - #/portal/gift/redeem/{token} / ?gift=TOKEN  → redemption view
 *  - ?stripe=gift-purchase-success (shell)       → success view
 */

import {GiftModal} from './GiftModal';
import {createApiClientFromSite} from '../../shared/api-client';
import {ensureSiteData} from '../../shared/api-client/site-data';
import type {FeatureMount} from '../../types';

const GIFT_CHROME = {
    panelClass: 'gh:max-w-none gh:w-full gh:min-h-full gh:rounded-none gh:shadow-none gh:p-0',
    backdropClass: 'gh:bg-white gh:p-0 gh:items-stretch gh:overflow-y-auto'
};

export const mount: FeatureMount = async ({services, params}) => {
    const site = services.getState().site;
    const api = createApiClientFromSite(site);

    const success = params?.view === 'success'
        ? {token: params?.token ?? '', tierId: params?.tierId, cadence: params?.cadence}
        : undefined;
    const giftToken = success ? undefined : (params?.giftToken ?? params?.token);

    // Portal only offers gift purchase when paid memberships are possible.
    if (!success && !giftToken && !site.paid_members_enabled) return;

    await ensureSiteData(services, api);

    const handle = services.openModal(
        <GiftModal
            services={services}
            api={api}
            giftToken={giftToken}
            success={success}
            onClose={() => handle.close()}
        />,
        GIFT_CHROME
    );
};
