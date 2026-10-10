import {
  getOfferData,
  getSiteData,
  getProductData,
  getPriceData,
} from '../../../../src/utils/fixtures-generator';
import { render } from '../../../utils/test-utils';
import OfferPage from '../../../../src/components/pages/offer-page';

const setup = (overrides) => {
  const { mockDoActionFn, ...utils } = render(<OfferPage />, {
    overrideContext: {
      member: null,
      ...overrides,
    },
  });

  return {
    mockDoActionFn,
    ...utils,
  };
};

describe('OfferPage', () => {
  test.each([
    {
      locale: 'de-CH',
      oldPrice: 'CHF 6.90',
      updatedPrice: 'CHF3.45',
      originalPrice: 'CHF6.90/month',
    },
    {
      locale: 'de-DE',
      oldPrice: 'CHF 6,90',
      updatedPrice: 'CHF3,45',
      originalPrice: 'CHF6,90/month',
    },
  ])(
    'formats original and discounted prices using $locale',
    ({ locale, oldPrice, updatedPrice, originalPrice }) => {
      const product = getProductData({
        monthlyPrice: getPriceData({ interval: 'month', amount: 690, currency: 'CHF' }),
      });
      const offer = getOfferData({ tierId: product.id, amount: 50, duration: 'once' });
      const site = { ...getSiteData({ products: [product] }), locale };
      const { container, getByTestId } = setup({ site, pageData: offer });

      expect(container.querySelector('.gh-portal-offer-oldprice')).toHaveTextContent(oldPrice);
      expect(getByTestId('offer-updated-price')).toHaveTextContent(updatedPrice);
      expect(getByTestId('offer-message')).toHaveTextContent(originalPrice);
    },
  );

  test.each([
    { locale: 'de-CH', updatedPrice: 'CHF5.80', discount: 'CHF1.10 off' },
    { locale: 'de-DE', updatedPrice: 'CHF5,80', discount: 'CHF1,10 off' },
  ])('formats fixed discounts using $locale', ({ locale, updatedPrice, discount }) => {
    const product = getProductData({
      monthlyPrice: getPriceData({ interval: 'month', amount: 690, currency: 'CHF' }),
    });
    const offer = getOfferData({ tierId: product.id, type: 'fixed', amount: 110, currency: 'CHF' });
    const site = { ...getSiteData({ products: [product] }), locale };
    const { getByTestId } = setup({ site, pageData: offer });

    expect(getByTestId('offer-updated-price')).toHaveTextContent(updatedPrice);
    expect(getByTestId('offer-discount-label')).toHaveTextContent(discount);
    expect(getByTestId('offer-message')).toHaveTextContent(discount);
  });

  test('formats the post-trial price using the site locale', () => {
    const product = getProductData({
      monthlyPrice: getPriceData({ interval: 'month', amount: 690, currency: 'CHF' }),
    });
    const offer = getOfferData({ tierId: product.id, type: 'trial', amount: 7, duration: 'trial' });
    const site = { ...getSiteData({ products: [product] }), locale: 'de-DE' };
    const { getByTestId } = setup({ site, pageData: offer });

    expect(getByTestId('offer-updated-price')).toHaveTextContent('CHF6,90');
    expect(getByTestId('offer-message')).toHaveTextContent('then CHF6,90/month');
  });

  test('sanitizes malicious XSS in signup terms HTML', () => {
    const product = getProductData({
      monthlyPrice: getPriceData({ interval: 'month', amount: 500 }),
      yearlyPrice: getPriceData({ interval: 'year', amount: 5000 }),
    });
    const offer = getOfferData({ tierId: product.id });
    const siteData = getSiteData({
      products: [product],
      membersSignupAccess: 'all',
    });
    siteData.portal_signup_terms_html = "<img src=x onerror=alert('XSS')>";

    const { container } = setup({
      site: siteData,
      pageData: offer,
    });

    const termsContent = container.querySelector('.gh-portal-signup-terms-content');
    expect(termsContent).toBeInTheDocument();
    expect(termsContent.innerHTML).toBe('');
    expect(termsContent.querySelector('img')).toBeNull();
  });
});
