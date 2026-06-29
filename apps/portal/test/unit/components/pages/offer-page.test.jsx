import {getOfferData, getSiteData, getProductData, getPriceData} from '../../../../src/utils/fixtures-generator';
import {render} from '../../../utils/test-utils';
import OfferPage from '../../../../src/components/pages/offer-page';

const setup = (overrides) => {
    const {mockDoActionFn, ...utils} = render(
        <OfferPage />,
        {
            overrideContext: {
                member: null,
                ...overrides
            }
        }
    );

    return {
        mockDoActionFn,
        ...utils
    };
};

describe('OfferPage', () => {
    test('sanitizes malicious XSS in signup terms HTML', () => {
        const product = getProductData({
            monthlyPrice: getPriceData({interval: 'month', amount: 500}),
            yearlyPrice: getPriceData({interval: 'year', amount: 5000})
        });
        const offer = getOfferData({tierId: product.id});
        const siteData = getSiteData({
            products: [product],
            membersSignupAccess: 'all'
        });
        siteData.portal_signup_terms_html = '<img src=x onerror=alert(\'XSS\')>';

        const {container} = setup({
            site: siteData,
            pageData: offer
        });

        const termsContent = container.querySelector('.gh-portal-signup-terms-content');
        expect(termsContent).toBeInTheDocument();
        expect(termsContent.innerHTML).toBe('');
        expect(termsContent.querySelector('img')).toBeNull();
    });
});
