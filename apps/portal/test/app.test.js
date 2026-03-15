import App from '../src/app';
import setupGhostApi from '../src/utils/api';
import {appRender} from './utils/test-utils';
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
