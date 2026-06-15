import {createApiClientFromSite, type MembersApiClient} from './index';
import {getPreviewMemberRecord} from './preview-fixtures';

/**
 * Admin-preview client: site reads pass through to the real Content API so
 * tier/newsletter data and prices stay live, the member is a fixture, and
 * every mutating or Stripe-redirecting call resolves as a no-op.
 */
export function createPreviewApiClient(site: {url: string; content_api_url?: string; search_api_key?: string}): MembersApiClient {
    const real = createApiClientFromSite(site);
    const record = (): ReturnType<typeof getPreviewMemberRecord> => getPreviewMemberRecord();
    return {
        site: real.site,
        member: {
            identity: async () => null,
            sessionData: async () => record(),
            update: async () => record(),
            deleteSuppression: async () => true,
            getIntegrityToken: async () => 'preview',
            sendMagicLink: async () => ({}),
            verifyOTC: async () => ({}),
            signout: async () => undefined,
            newsletters: async () => null,
            updateNewsletters: async () => {
                const m = record();
                return {uuid: m.uuid, email: m.email, newsletters: []};
            },
            updateEmailAddress: async () => undefined,
            checkoutPlan: async () => undefined,
            editBilling: async () => undefined,
            manageBilling: async () => undefined,
            updateSubscription: async () => new Response('{}', {status: 200}),
            offers: async () => ({offers: []}),
            applyOffer: async () => true,
            checkoutGift: async () => undefined,
            continueGiftCheckout: async () => undefined,
            checkoutDonation: async () => ({})
        },
        feedback: {
            add: async () => ({})
        },
        gift: {
            fetchRedemptionData: async () => ({gifts: []}),
            redeem: async () => ({gifts: []})
        },
        recommendations: {
            trackClicked: () => undefined,
            trackSubscribed: () => undefined
        }
    };
}
