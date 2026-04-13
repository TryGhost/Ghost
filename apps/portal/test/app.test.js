import App from '../src/app';
import setupGhostApi from '../src/utils/api';
import {appRender, within} from './utils/test-utils';
import {getPriceData, getProductData, getSiteData} from '../src/utils/fixtures-generator';
import {site as FixtureSite, member as FixtureMember} from './utils/test-fixtures';
import i18n from '../src/utils/i18n';
import {vi} from 'vitest';

vi.mock('../src/utils/i18n', () => ({
    default: {
        changeLanguage: vi.fn(),
        dir: vi.fn(),
        t: vi.fn(str => str)
    },
    t: vi.fn(str => str)
}));

const createDeferred = () => {
    let resolve;
    const promise = new Promise((res) => {
        resolve = res;
    });

    return {
        promise,
        resolve
    };
};

describe('App', function () {
    beforeEach(function () {
        // Stub window.location with a URL object so we have an expected origin
        const location = new URL('http://example.com');
        delete window.location;
        window.location = location;
    });

    function setupApi({site = {}, member = {}} = {}) {
        const defaultSite = FixtureSite.singleTier.basic;
        const defaultMember = FixtureMember.free;

        const siteFixtures = {
            ...defaultSite,
            ...site
        };

        const memberFixtures = {
            ...defaultMember,
            ...member
        };

        const ghostApi = setupGhostApi({siteUrl: 'http://example.com'});
        ghostApi.init = vi.fn(() => {
            return Promise.resolve({
                site: siteFixtures,
                member: memberFixtures
            });
        });

        return ghostApi;
    }

    test('transforms portal links on render', async () => {
        const link = document.createElement('a');
        link.setAttribute('href', 'http://example.com/#/portal/signup');
        document.body.appendChild(link);

        const ghostApi = setupApi();
        const utils = appRender(
            <App siteUrl="http://example.com" api={ghostApi} />
        );

        await utils.findByTitle(/portal-popup/i);

        expect(link.getAttribute('href')).toBe('#/portal/signup');
    });

    test('transforms share links on render', async () => {
        const link = document.createElement('a');
        link.setAttribute('href', 'http://example.com/#/share');
        document.body.appendChild(link);

        const ghostApi = setupApi();
        const utils = appRender(
            <App siteUrl="http://example.com" api={ghostApi} />
        );

        await utils.findByTitle(/portal-popup/i);

        expect(link.getAttribute('href')).toBe('#/share');
    });

    test('shows gift redemption success notification when popup is open on load', async () => {
        window.location = new URL('http://example.com/?action=subscribe&success=true#/portal/account?giftRedemption=true');

        const ghostApi = setupApi();
        const utils = appRender(
            <App siteUrl="http://example.com" api={ghostApi} />
        );

        const popupFrame = await utils.findByTitle(/portal-popup/i);
        const notificationFrame = await utils.findByTitle(/portal-notification/i);

        expect(popupFrame).toBeInTheDocument();
        expect(notificationFrame).toBeInTheDocument();
        expect(within(notificationFrame.contentDocument).getByText('Gift redeemed! You\'re all set.')).toBeInTheDocument();
    });

    test('shows gift redemption error notification when popup is open on load', async () => {
        window.location = new URL('http://example.com/?action=subscribe&success=false#/portal/account?giftRedemption=true');

        const ghostApi = setupApi();
        const utils = appRender(
            <App siteUrl="http://example.com" api={ghostApi} />
        );

        const popupFrame = await utils.findByTitle(/portal-popup/i);
        const notificationFrame = await utils.findByTitle(/portal-notification/i);

        expect(popupFrame).toBeInTheDocument();
        expect(notificationFrame).toBeInTheDocument();
        expect(within(notificationFrame.contentDocument).getByText('We couldn\'t redeem this gift for your account.')).toBeInTheDocument();
    });

    test('prefers locale prop over site locale for i18n language', async () => {
        const ghostApi = setupApi({
            site: {
                locale: 'de'
            }
        });

        const utils = appRender(
            <App siteUrl="http://example.com" api={ghostApi} locale="en" />
        );

        await utils.findByTitle(/portal-popup/i);

        i18n.changeLanguage.mock.calls.forEach((call) => {
            expect(call[0]).toBe('en');
        });
    });

    test('reloads page when popup closes with reloadOnPopupClose flag', () => {
        const app = new App({siteUrl: 'http://example.com'});

        window.location.reload = vi.fn();

        app.state = {...app.state, showPopup: false, reloadOnPopupClose: true};
        app.componentDidUpdate({}, {showPopup: true});

        expect(window.location.reload).toHaveBeenCalledTimes(1);
    });

    test('does not reload when popup closes without reloadOnPopupClose flag', () => {
        const app = new App({siteUrl: 'http://example.com'});

        window.location.reload = vi.fn();

        app.state = {...app.state, showPopup: false};
        app.componentDidUpdate({}, {showPopup: true});

        expect(window.location.reload).not.toHaveBeenCalled();
    });

    test('does not reload when reloadOnPopupClose is false', () => {
        const app = new App({siteUrl: 'http://example.com'});

        window.location.reload = vi.fn();

        // Set reloadOnPopupClose to false explicitly and close the popup
        app.state = {...app.state, showPopup: false, reloadOnPopupClose: false};
        app.componentDidUpdate({}, {showPopup: true});

        expect(window.location.reload).not.toHaveBeenCalled();
    });

    test('ignores malformed gift redemption tokens in hash links', async () => {
        window.location.hash = '#/portal/gift/redeem/%E0%A4%A';

        const app = new App({siteUrl: 'http://example.com'});
        app.fetchGiftRedemptionData = vi.fn();

        const result = await app.fetchLinkData(FixtureSite.singleTier.basic, FixtureMember.free);

        expect(result).toEqual({});
        expect(app.fetchGiftRedemptionData).not.toHaveBeenCalled();
    });

    test('ignores malformed gift redemption tokens in trigger links', async () => {
        const app = new App({siteUrl: 'http://example.com'});
        app.dispatchAction = vi.fn();
        app.fetchGiftRedemptionData = vi.fn();
        app.state = {
            ...app.state,
            initStatus: 'success',
            site: {...FixtureSite.singleTier.basic, labs: {giftSubscriptions: true}}
        };

        await app.clickHandler({
            preventDefault: vi.fn(),
            currentTarget: {
                dataset: {
                    portal: 'gift/redeem/%E0%A4%A'
                }
            }
        });

        expect(app.fetchGiftRedemptionData).not.toHaveBeenCalled();
        expect(app.dispatchAction).not.toHaveBeenCalled();
    });

    test('drops stale custom-trigger gift redemption responses', async () => {
        const app = new App({siteUrl: 'http://example.com'});
        const firstRequest = createDeferred();
        const secondRequest = createDeferred();

        app.setState = vi.fn((updatedState) => {
            app.state = {...app.state, ...updatedState};
        });
        app.state = {
            ...app.state,
            initStatus: 'success',
            site: {...FixtureSite.singleTier.basic, labs: {giftSubscriptions: true}}
        };
        app.fetchGiftRedemptionData = vi.fn(({token}) => {
            return token === 'first-token' ? firstRequest.promise : secondRequest.promise;
        });

        const firstClick = app.clickHandler({
            preventDefault: vi.fn(),
            currentTarget: {
                dataset: {
                    portal: 'gift/redeem/first-token'
                }
            }
        });
        const secondClick = app.clickHandler({
            preventDefault: vi.fn(),
            currentTarget: {
                dataset: {
                    portal: 'gift/redeem/second-token'
                }
            }
        });

        secondRequest.resolve({
            page: 'giftRedemption',
            pageData: {
                token: 'second-token'
            }
        });
        await secondClick;

        firstRequest.resolve({
            page: 'giftRedemption',
            pageData: {
                token: 'first-token'
            }
        });
        await firstClick;

        expect(app.setState).toHaveBeenCalledTimes(1);
        expect(app.state.pageData.token).toBe('second-token');
    });

    test('drops stale hashchange gift redemption responses', async () => {
        const app = new App({siteUrl: 'http://example.com'});
        const firstRequest = createDeferred();
        const secondRequest = createDeferred();

        app.setState = vi.fn((updatedState) => {
            app.state = {...app.state, ...updatedState};
        });
        app.state = {
            ...app.state,
            site: {...FixtureSite.singleTier.basic, labs: {giftSubscriptions: true}},
            member: FixtureMember.free
        };
        app.fetchGiftRedemptionData = vi.fn(({token}) => {
            return token === 'first-token' ? firstRequest.promise : secondRequest.promise;
        });

        window.location.hash = '#/portal/gift/redeem/first-token';
        const firstUpdate = app.updateStateForPreviewLinks();

        window.location.hash = '#/portal/gift/redeem/second-token';
        const secondUpdate = app.updateStateForPreviewLinks();

        secondRequest.resolve({
            showPopup: true,
            page: 'giftRedemption',
            pageData: {
                token: 'second-token'
            }
        });
        await secondUpdate;

        firstRequest.resolve({
            showPopup: true,
            page: 'giftRedemption',
            pageData: {
                token: 'first-token'
            }
        });
        await firstUpdate;

        expect(app.state.pageData.token).toBe('second-token');
        expect(app.setState).toHaveBeenCalledTimes(1);
    });

    test('parses retention offer preview query data into account cancellation flow', () => {
        const app = new App({siteUrl: 'http://example.com'});
        const previewData = app.fetchOfferQueryStrData('redemption_type=retention&display_title=Before%2520you%2520go&display_description=Please%2520stay&type=percent&amount=100&duration=repeating&duration_in_months=2&cadence=month&tier_id=product_123&enabled=false');

        expect(previewData.page).toBe('accountPlan');
        expect(previewData.pageData).toMatchObject({
            action: 'cancel'
        });
        expect(previewData.offers).toHaveLength(1);
        expect(previewData.offers[0]).toMatchObject({
            display_title: 'Before you go',
            display_description: 'Please stay',
            redemption_type: 'retention',
            type: 'percent',
            amount: 100,
            duration: 'repeating',
            duration_in_months: 2,
            cadence: 'month'
        });
        expect(previewData.offers[0].tier).toMatchObject({id: 'product_123'});
    });

    test('uses the selected tier price for retention offer preview members', () => {
        window.location.hash = '#/portal/preview/offer';

        const yearlyPrice = getPriceData({interval: 'year', amount: 25000, currency: 'usd'});
        const paidProduct = getProductData({
            name: 'Pro',
            monthlyPrice: getPriceData({interval: 'month', amount: 2500, currency: 'usd'}),
            yearlyPrice
        });
        const site = getSiteData({
            products: [paidProduct],
            portalProducts: [paidProduct.id]
        });
        const app = new App({siteUrl: 'http://example.com'});
        const previewData = app.fetchOfferQueryStrData(`redemption_type=retention&display_title=Stay&display_description=Please%2520stay&type=percent&amount=25&duration=forever&duration_in_months=0&cadence=year&tier_id=${paidProduct.id}`);

        app.state = {
            ...app.state,
            site,
            page: previewData.page,
            offers: previewData.offers,
            pageData: previewData.pageData
        };

        const context = app.getContextFromState();
        const subscription = context.member.subscriptions[0];

        expect(subscription.price.amount).toBe(yearlyPrice.amount);
        expect(subscription.price.interval).toBe('year');
        expect(subscription.price.price_id).toBe(yearlyPrice.id);
        expect(subscription.tier).toMatchObject({
            id: paidProduct.id,
            name: paidProduct.name
        });
    });
});
