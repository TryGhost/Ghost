import GiftSuccessPage from '../../../../src/components/pages/gift-success-page';
import BetaGiftSuccessPage from '../../../../src/components/pages/beta-gift-success-page';
import {getPriceData, getProductData, getSiteData} from '../../../../src/utils/fixtures-generator';
import {render} from '../../../utils/test-utils';

function setup({Page, monthlyPrice, deliveryMethod = 'link', deliveryDate}: {
    Page: typeof GiftSuccessPage;
    monthlyPrice: ReturnType<typeof getPriceData> | null;
    deliveryMethod?: 'email' | 'link';
    deliveryDate?: string;
}) {
    const product = {
        ...getProductData({
            id: 'tier_123',
            name: 'Premium',
            yearlyPrice: getPriceData({amount: 5000, interval: 'year'})
        }),
        monthlyPrice
    };
    const site = getSiteData({
        products: [product],
        portalProducts: [product.id]
    });

    return render(<Page />, {
        overrideContext: {
            site,
            pageData: {
                token: 'abc123',
                tierId: 'tier_123',
                cadence: 'month',
                duration: 3,
                deliveryMethod,
                deliveryDate
            }
        }
    });
}

describe.each([
    {name: 'GiftSuccessPage', Page: GiftSuccessPage},
    {name: 'BetaGiftSuccessPage', Page: BetaGiftSuccessPage}
])('$name', ({Page}) => {
    test('shows the multiplied monthly price as the gift value', () => {
        const {getByTestId} = setup({
            Page,
            monthlyPrice: getPriceData({amount: 500, interval: 'month'})
        });

        expect(getByTestId('gift-redeem-link')).toHaveTextContent('/gift/abc123');
        expect(getByTestId('gift-card-duration')).toHaveTextContent('3 months');
        expect(getByTestId('gift-card-value')).toHaveTextContent('$15');
    });

    test('renders without card details when the tier no longer has a monthly price', () => {
        const {getByTestId, queryByTestId} = setup({Page, monthlyPrice: null});

        expect(getByTestId('gift-redeem-link')).toHaveTextContent('/gift/abc123');
        expect(queryByTestId('gift-card-duration')).not.toBeInTheDocument();
        expect(queryByTestId('gift-card-value')).not.toBeInTheDocument();
    });
});

describe('BetaGiftSuccessPage', () => {
    test('uses email delivery wording and keeps the redemption link', () => {
        const {getByText, getByTestId} = setup({
            Page: BetaGiftSuccessPage,
            monthlyPrice: getPriceData({amount: 500, interval: 'month'}),
            deliveryMethod: 'email'
        });

        expect(getByText('Your gift is on its way')).toBeInTheDocument();
        expect(getByText("We'll email it to the recipient. A copy will be in your inbox too.")).toBeInTheDocument();
        expect(getByText('Share it yourself')).toBeInTheDocument();
        expect(getByTestId('gift-redeem-link')).toHaveTextContent('/gift/abc123');
    });

    test('uses scheduled delivery wording and preserves the site-calendar date', () => {
        const {getByText, getByTestId} = setup({
            Page: BetaGiftSuccessPage,
            monthlyPrice: getPriceData({amount: 500, interval: 'month'}),
            deliveryMethod: 'email',
            deliveryDate: '2026-12-25'
        });

        expect(getByText('Your gift is scheduled')).toBeInTheDocument();
        expect(getByText("We'll email it to the recipient on 25 Dec 2026. A copy is in your inbox too.")).toBeInTheDocument();
        expect(getByTestId('gift-redeem-link')).toHaveTextContent('/gift/abc123');
    });
});
