import { render } from '../../../utils/test-utils';
import ProductsSection from '../../../../src/components/common/products-section';
import { getProductData, getPriceData, getSiteData } from '../../../../src/utils/fixtures-generator';

describe('ProductsSection', () => {
  test('renders fractional tier price with two decimal places and site locale', () => {
    const product = getProductData({
      name: 'Bronze',
      monthlyPrice: getPriceData({ interval: 'month', amount: 690, currency: 'CHF' }),
      yearlyPrice: getPriceData({ interval: 'year', amount: 690, currency: 'CHF' }),
    });

    const site = {
      ...getSiteData({
        products: [product],
      }),
      locale: 'de',
    };

    const { getAllByTestId } = render(
      <ProductsSection products={[product]} onPlanSelect={vi.fn()} />,
      {
        overrideContext: {
          site,
        },
      },
    );

    const amounts = getAllByTestId('product-amount');
    expect(amounts[0]).toHaveTextContent('6,90');
  });

  test('renders fractional tier price with two decimal places in default locale', () => {
    const product = getProductData({
      name: 'Bronze',
      monthlyPrice: getPriceData({ interval: 'month', amount: 690, currency: 'USD' }),
      yearlyPrice: getPriceData({ interval: 'year', amount: 690, currency: 'USD' }),
    });

    const site = getSiteData({
      products: [product],
    });

    const { getAllByTestId } = render(
      <ProductsSection products={[product]} onPlanSelect={vi.fn()} />,
      {
        overrideContext: {
          site,
        },
      },
    );

    const amounts = getAllByTestId('product-amount');
    expect(amounts[0]).toHaveTextContent('6.90');
  });
});
