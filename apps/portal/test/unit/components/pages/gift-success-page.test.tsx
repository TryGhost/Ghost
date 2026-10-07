import GiftSuccessPage from '../../../../src/components/pages/gift-success-page';
import {
  getPriceData,
  getProductData,
  getSiteData,
} from '../../../../src/utils/fixtures-generator';
import { render } from '../../../utils/test-utils';
import { toDateValue } from '../../../../src/utils/date-time';

function setup({
  Page,
  monthlyPrice,
  deliveryMethod = 'link',
  duration = 3,
  deliveryDate,
  scheduledAt,
}: {
  Page: typeof GiftSuccessPage;
  monthlyPrice: ReturnType<typeof getPriceData> | null;
  deliveryMethod?: 'email' | 'link';
  duration?: number;
  deliveryDate?: string;
  scheduledAt?: number;
}) {
  const product = {
    ...getProductData({
      id: 'tier_123',
      name: 'Premium',
      yearlyPrice: getPriceData({ amount: 5000, interval: 'year' }),
    }),
    monthlyPrice,
  };
  const site = getSiteData({
    products: [product],
    portalProducts: [product.id],
  });

  return render(<Page />, {
    overrideContext: {
      site,
      pageData: {
        token: 'abc123',
        tierId: 'tier_123',
        cadence: 'month',
        duration,
        deliveryMethod,
        deliveryDate,
        scheduledAt,
      },
    },
  });
}

describe.each([{ name: 'GiftSuccessPage', Page: GiftSuccessPage }])('$name', ({ Page }) => {
  test('shows the multiplied monthly price as the gift value', () => {
    const { getByTestId } = setup({
      Page,
      monthlyPrice: getPriceData({ amount: 500, interval: 'month' }),
    });

    expect(getByTestId('gift-redeem-link')).toHaveTextContent('/gift/abc123');
    expect(getByTestId('gift-card-duration')).toHaveTextContent('3 months');
    expect(getByTestId('gift-card-value')).toHaveTextContent('$15');
  });

  test('renders without card details when the tier no longer has a monthly price', () => {
    const { getByTestId, queryByTestId } = setup({ Page, monthlyPrice: null });

    expect(getByTestId('gift-redeem-link')).toHaveTextContent('/gift/abc123');
    expect(queryByTestId('gift-card-duration')).not.toBeInTheDocument();
    expect(queryByTestId('gift-card-value')).not.toBeInTheDocument();
  });

  test('shows a twelve-month gift as one year', () => {
    const { getByTestId } = setup({
      Page,
      monthlyPrice: getPriceData({ amount: 500, interval: 'month' }),
      duration: 12,
    });

    expect(getByTestId('gift-card-duration')).toHaveTextContent('1 year');
  });
});

describe('GiftSuccessPage delivery', () => {
  test('uses email delivery wording and keeps the redemption link', () => {
    const { getByText, getByTestId } = setup({
      Page: GiftSuccessPage,
      monthlyPrice: getPriceData({ amount: 500, interval: 'month' }),
      deliveryMethod: 'email',
    });

    expect(getByText('Your gift is on its way')).toBeInTheDocument();
    expect(
      getByText("We'll email it to the recipient. A copy will be in your inbox too."),
    ).toBeInTheDocument();
    expect(getByText('Share it yourself')).toBeInTheDocument();
    expect(getByTestId('gift-redeem-link')).toHaveTextContent('/gift/abc123');
  });

  test('uses scheduled delivery wording and preserves the site-calendar date', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 60);
    const deliveryDate = toDateValue(futureDate);
    const formattedDate = futureDate.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const { getByText, getByTestId } = setup({
      Page: GiftSuccessPage,
      monthlyPrice: getPriceData({ amount: 500, interval: 'month' }),
      deliveryMethod: 'email',
      deliveryDate,
      scheduledAt: futureDate.getTime(),
    });

    expect(getByText('Your gift is scheduled')).toBeInTheDocument();
    expect(
      getByText(
        `We'll email it to the recipient on ${formattedDate}. A copy is in your inbox too.`,
      ),
    ).toBeInTheDocument();
    expect(getByTestId('gift-redeem-link')).toHaveTextContent('/gift/abc123');
  });

  // The schedule is baked into the success URL at checkout-session
  // creation; a payment completed after the send instant delivers
  // immediately, so a passed instant must not promise a scheduled send.
  test('uses immediate delivery wording when the send instant has passed', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const { getByText } = setup({
      Page: GiftSuccessPage,
      monthlyPrice: getPriceData({ amount: 500, interval: 'month' }),
      deliveryMethod: 'email',
      deliveryDate: toDateValue(futureDate),
      scheduledAt: Date.now() - 60_000,
    });

    expect(getByText('Your gift is on its way')).toBeInTheDocument();
    expect(
      getByText("We'll email it to the recipient. A copy will be in your inbox too."),
    ).toBeInTheDocument();
  });

  test('uses immediate delivery wording when no send instant accompanies the date', () => {
    const { getByText } = setup({
      Page: GiftSuccessPage,
      monthlyPrice: getPriceData({ amount: 500, interval: 'month' }),
      deliveryMethod: 'email',
      deliveryDate: '2020-01-01',
    });

    expect(getByText('Your gift is on its way')).toBeInTheDocument();
  });
});
