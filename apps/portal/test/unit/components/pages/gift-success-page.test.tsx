import GiftSuccessPage from '../../../../src/components/pages/gift-success-page';
import {getPriceData, getProductData, getSiteData} from '../../../../src/utils/fixtures-generator';
import {render} from '../../../utils/test-utils';

function setup({monthlyPrice}: {monthlyPrice: ReturnType<typeof getPriceData> | null}) {
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

    return render(<GiftSuccessPage />, {
        overrideContext: {
            site,
            pageData: {
                token: 'abc123',
                tierId: 'tier_123',
                cadence: 'month',
                duration: 3
            }
        }
    });
}

describe('GiftSuccessPage', () => {
    test('shows the multiplied monthly price as the gift value', () => {
        const {getByTestId} = setup({
            monthlyPrice: getPriceData({amount: 500, interval: 'month'})
        });

        expect(getByTestId('gift-redeem-link')).toHaveTextContent('/gift/abc123');
        expect(getByTestId('gift-card-duration')).toHaveTextContent('3 months');
        expect(getByTestId('gift-card-value')).toHaveTextContent('$15');
    });

    test('renders without card details when the tier no longer has a monthly price', () => {
        const {getByTestId, queryByTestId} = setup({monthlyPrice: null});

        expect(getByTestId('gift-redeem-link')).toHaveTextContent('/gift/abc123');
        expect(queryByTestId('gift-card-duration')).not.toBeInTheDocument();
        expect(queryByTestId('gift-card-value')).not.toBeInTheDocument();
    });
});
