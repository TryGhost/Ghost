import { fireEvent, render } from '../../../../utils/test-utils';
import GiveGiftCard from '../../../../../src/components/pages/AccountHomePage/components/give-gift-card';
import {
  getMemberData,
  getSiteData,
  getSubscriptionData,
} from '../../../../../src/utils/fixtures-generator';

type SiteData = ReturnType<typeof getSiteData> & {
  portal_account_gift_promotion?: boolean;
};
type MemberData = ReturnType<typeof getMemberData> & {
  status?: string;
};

const paidSite = (overrides: Partial<SiteData> = {}): SiteData => ({
  ...getSiteData(),
  portal_account_gift_promotion: true,
  ...overrides,
});

const paidMember = (overrides: Partial<MemberData> = {}): MemberData => ({
  ...getMemberData({ paid: true }),
  status: 'paid',
  subscriptions: [getSubscriptionData()],
  ...overrides,
});

const setup = ({
  site = paidSite(),
  member = paidMember(),
}: { site?: SiteData; member?: MemberData } = {}) =>
  render(<GiveGiftCard />, { overrideContext: { site, member } });

describe('GiveGiftCard', () => {
  test('renders for paid members and opens gift checkout from account home', () => {
    const { getByRole, mockDoActionFn } = setup();

    fireEvent.click(getByRole('button', { name: /Gift membership/ }));

    expect(mockDoActionFn).toHaveBeenCalledWith('switchPage', {
      page: 'gift',
      lastPage: 'accountHome',
    });
  });

  test.each(['Enter', ' '])('opens gift checkout with the %j key', (key) => {
    const { getByRole, mockDoActionFn } = setup();

    fireEvent.keyDown(getByRole('button', { name: /Gift membership/ }), { key });

    expect(mockDoActionFn).toHaveBeenCalledWith('switchPage', {
      page: 'gift',
      lastPage: 'accountHome',
    });
  });

  test('renders for complimentary members', () => {
    const { getByText } = setup({ member: paidMember({ status: 'comped', subscriptions: [] }) });

    expect(getByText('Gift membership')).toBeInTheDocument();
  });

  test('renders for paid members with a scheduled cancellation', () => {
    const member = paidMember({
      subscriptions: [getSubscriptionData({ cancelAtPeriodEnd: true })],
    });
    const { getByText } = setup({ member });

    expect(getByText('Gift membership')).toBeInTheDocument();
  });

  test.each([
    {
      label: 'the member is free',
      member: { ...getMemberData({ paid: false }), status: 'free' },
    },
    {
      label: 'the member is a gift recipient',
      member: paidMember({ status: 'gift' }),
    },
  ])('does not render when $label', ({ member }) => {
    const { queryByText } = setup({ member });

    expect(queryByText('Gift membership')).not.toBeInTheDocument();
  });

  test.each([
    {
      label: 'the setting is missing',
      site: getSiteData(),
    },
    {
      label: 'the setting is disabled',
      site: paidSite({ portal_account_gift_promotion: false }),
    },
    {
      label: 'there is no giftable offering',
      site: paidSite({ portal_plans: ['free'] }),
    },
  ])('does not render when $label', ({ site }) => {
    const { queryByText } = setup({ site });

    expect(queryByText('Gift membership')).not.toBeInTheDocument();
  });
});
