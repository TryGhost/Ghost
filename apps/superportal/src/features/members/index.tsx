/**
 * Members feature chunk — signin, signup, account, email prefs, data-members-form binding.
 *
 * Loaded eagerly after first paint when 'members' is in state.features.
 * Mounted eagerly-on-mount when [data-members-form] elements exist on the page.
 */

import {MembersModal, type MembersPage} from './MembersModal';
import {bindDataAttributes} from './data-attributes';
import {createApiClientFromSite} from '../../shared/api-client';
import {createPreviewApiClient} from '../../shared/api-client/preview';
import {ensureSiteData} from '../../shared/api-client/site-data';
import {warn} from '../../shared/log';
import type {FeatureMount} from '../../types';

export const mount: FeatureMount = async ({services, params}) => {
    const action = params?.action ?? 'signup';
    const site = services.getState().site;
    const preview = Boolean(services.getState().preview);
    const api = preview ? createPreviewApiClient(site) : createApiClientFromSite(site);

    // Bind-forms mode: scan DOM and wire data-attribute handlers. No modal.
    if (action === 'bind-forms') {
        bindDataAttributes({siteUrl: site.url, t: services.t});
        return;
    }

    await ensureSiteData(services, api);

    // Map action string to the page enum.
    let initialPage: MembersPage;
    switch (action) {
    case 'signin':
        initialPage = 'signin';
        break;
    case 'account':
        initialPage = 'account';
        break;
    case 'email-receiving-faq':
        initialPage = 'email-receiving-faq';
        break;
    case 'email-suppression-faq':
        initialPage = 'email-suppression-faq';
        break;
    case 'signup':
    default:
        initialPage = 'signup';
        break;
    }

    // The two FAQ pages reached via hash are "direct" (no back button / header).
    const initialDirect = action === 'email-receiving-faq' || action === 'email-suppression-faq';

    const handle = services.openModal(
        // In preview, key by the hash so each admin settings change remounts
        // the modal content — open() reuses the React root, and without the
        // key React would preserve MembersModal's page/form state.
        <MembersModal
            key={preview ? window.location.hash : undefined}
            services={services}
            api={api}
            initialPage={initialPage}
            initialTier={params?.tier}
            initialCadence={params?.cadence}
            initialDirect={initialDirect}
            onClose={() => {
                warn(`members modal closed (action: ${action})`);
                handle.close();
            }}
            onLayoutChange={(fullScreen) => {
                handle.setChrome(fullScreen ? FULLSCREEN_CHROME : CENTERED_CHROME);
            }}
        />,
        {panelClass: CENTERED_CHROME.panelClass, dismissible: !preview}
    );
};

// Portal's standard popup container: 500px wide, 32px padding.
const CENTERED_CHROME = {
    panelClass: 'gh:max-w-[500px] gh:p-8',
    backdropClass: ''
};

// Portal's full-size signup chrome (frame.styles.js:372): white full-viewport
// takeover, scrollable, no panel radius/shadow.
const FULLSCREEN_CHROME = {
    panelClass: 'gh:max-w-none gh:min-h-full gh:rounded-none gh:shadow-none gh:px-[6vmin] gh:py-6 gh:max-[480px]:px-7',
    backdropClass: 'gh:bg-white gh:p-0 gh:items-stretch gh:overflow-y-auto'
};
