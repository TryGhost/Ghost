import { render } from '../../../../utils/test-utils';
import AccountWelcome from '../../../../../src/components/pages/AccountHomePage/components/account-welcome';
import {
  getDiscountData,
  getMemberData,
  getNextPaymentData,
  getProductsData,
  getSiteData,
  getSubscriptionData,
} from '../../../../../src/utils/fixtures-generator';

const setup = (overrides) => {
  return render(<AccountWelcome />, {
    overrideContext: {
      ...overrides,
    },
  });
};

describe('AccountWelcome', () => {
  describe.each([
    { membersSignupAccess: 'all' },
    { membersSignupAccess: 'paid' },
    { membersSignupAccess: 'invite' },
  ])('free members when signup access is $membersSignupAccess', ({ membersSignupAccess }) => {
    const member = getMemberData({ status: 'free', paid: false, subscriptions: [] });

    test('can view plans', () => {
      const site = getSiteData({ membersSignupAccess });
      const { queryByRole } = setup({ site, member });

      expect(queryByRole('button', { name: 'View plans' })).toBeInTheDocument();
    });

    test('see no plans button when no paid prices are on', () => {
      const site = getSiteData({ membersSignupAccess, portalPlans: ['free', 'monthly'] });
      const noPricesSite = { ...site, portal_plans: ['free'] };
      const { queryByRole } = setup({ site: noPricesSite, member });

      expect(queryByRole('button', { name: 'View plans' })).not.toBeInTheDocument();
    });
  });

  test('shows gift expiry message for gift members', () => {
    const products = getProductsData({ numOfProducts: 1 });
    const site = getSiteData({ products, portalProducts: products.map((p) => p.id) });

    const member = getMemberData({
      paid: true,
      status: 'gift',
      subscriptions: [
        getSubscriptionData({
          status: 'active',
          amount: 0,
          currency: 'USD',
          interval: 'year',
          tier: {
            expiry_at: new Date('2099-04-12T12:00:00.000Z'),
          },
        }),
      ],
    });

    const { queryByText } = setup({ site, member });

    expect(queryByText('Your gift subscription will expire on 12 Apr 2099')).toBeInTheDocument();
  });

  test('uses current period end for renewal date on free months offers', () => {
    const products = getProductsData({ numOfProducts: 1 });
    const site = getSiteData({ products, portalProducts: products.map((p) => p.id) });

    const member = getMemberData({
      paid: true,
      subscriptions: [
        getSubscriptionData({
          status: 'active',
          amount: 500,
          currency: 'USD',
          interval: 'month',
          currentPeriodEnd: '2099-01-15T12:00:00.000Z',
          offer: {
            type: 'percent',
            amount: 100,
            duration: 'repeating',
            duration_in_months: 2,
            redemption_type: 'retention',
          },
          nextPayment: getNextPaymentData({
            originalAmount: 500,
            amount: 0,
            interval: 'month',
            currency: 'USD',
            discount: getDiscountData({
              duration: 'repeating',
              type: 'percent',
              amount: 100,
              end: '2099-03-15T12:00:00.000Z',
            }),
          }),
        }),
      ],
    });

    const { queryByText } = setup({ site, member });

    expect(queryByText('Your subscription will renew on 15 Jan 2099')).toBeInTheDocument();
    expect(queryByText('Your subscription will renew on 15 Mar 2099')).not.toBeInTheDocument();
  });
});
