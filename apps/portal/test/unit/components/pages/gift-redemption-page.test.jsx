import { fireEvent, render, waitFor } from '../../../utils/test-utils';
import GiftRedemptionPage from '../../../../src/components/pages/gift-redemption-page';
import { member, testSite } from '../../../../src/utils/fixtures';

const gift = {
  cadence: 'year',
  duration: 1,
  tier: {
    id: 'tier_1',
    name: 'Premium',
    description: 'Premium tier',
    benefits: ['Premium articles', 'Members-only newsletter'],
  },
};

const renderGiftRedemptionPage = (Page, overrideContext = {}) => {
  return render(<Page />, {
    overrideContext: {
      site: {
        ...testSite,
        url: 'https://example.com/',
      },
      pageData: {
        token: 'gift-token-123',
        gift,
      },
      member: null,
      ...overrideContext,
    },
  });
};

describe.each([
  { name: 'GiftRedemptionPage', Page: GiftRedemptionPage, buttonLabel: 'Redeem your gift' },
])('$name', ({ Page, buttonLabel }) => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/#/portal/gift/redeem/gift-token-123');
  });

  test('lets a logged-in member redeem without rendering the form', () => {
    const { queryByLabelText, getByRole, mockDoActionFn } = renderGiftRedemptionPage(Page, {
      member: member.free,
    });

    expect(queryByLabelText(/your name/i)).not.toBeInTheDocument();
    expect(queryByLabelText(/your email/i)).not.toBeInTheDocument();

    fireEvent.click(getByRole('button', { name: buttonLabel }));

    expect(mockDoActionFn).toHaveBeenCalledWith('redeemGift', {
      giftToken: 'gift-token-123',
      answers: {},
      asked: [],
    });
  });

  // Requirements in the order the API returns them, by name, which differs from the order Portal
  // shows them in. Each port names the custom field that holds the member's saved value.
  const SHIPPING_AND_PHONE = [
    { name: 'phone', ports: { number: { port: 'checkout.phone', field: 'custom.contact_phone' } } },
    {
      name: 'shipping',
      ports: {
        recipient: { port: 'checkout.shipping.name', field: 'custom.recipient_name' },
        address: { port: 'checkout.shipping.address', field: 'custom.delivery_address' },
      },
    },
  ];
  const requiring = (requirements) => ({
    token: 'gift-token-123',
    gift: { ...gift, tier: { ...gift.tier, requirements } },
  });

  test("shows the tier's requirement inputs to a logged-in member, prefilled with their saved values", async () => {
    const { getByRole, findByLabelText, getByLabelText, mockDoActionFn } = renderGiftRedemptionPage(
      Page,
      {
        member: {
          ...member.free,
          metafields: {
            custom: { recipient_name: 'Ada Lovelace', contact_phone: '+44 7400 123456' },
          },
        },
        pageData: requiring(SHIPPING_AND_PHONE),
      },
    );

    expect(await findByLabelText('Recipient name')).toHaveValue('Ada Lovelace');
    expect(getByLabelText('Phone number')).toHaveValue('7400 123456');
    // The redeem button stays disabled until every input has a value.
    const redeem = getByRole('button', { name: buttonLabel });
    expect(redeem).toBeDisabled();

    fireEvent.change(getByLabelText('Address line 1'), { target: { value: '1 High Street' } });
    // An address isn't complete without a country.
    expect(redeem).toBeDisabled();
    fireEvent.change(getByLabelText('Country'), { target: { value: 'GB' } });
    expect(redeem).toBeEnabled();
    fireEvent.click(redeem);

    // `answers` is keyed by checkout port, and `asked` is the list of inputs that were shown.
    expect(mockDoActionFn).toHaveBeenCalledWith('redeemGift', {
      giftToken: 'gift-token-123',
      answers: {
        'checkout.shipping.name': 'Ada Lovelace',
        'checkout.shipping.address': { line1: '1 High Street', country: 'GB' },
        'checkout.phone': '+44 7400 123456',
      },
      asked: expect.arrayContaining([expect.objectContaining({ key: 'checkout.phone' })]),
    });
  });

  test("shows the server's validation error next to the input it belongs to", async () => {
    const { findByLabelText, getByText } = renderGiftRedemptionPage(Page, {
      member: member.free,
      pageData: requiring([SHIPPING_AND_PHONE[0]]),
      fieldErrors: { 'custom:checkout.phone': 'Enter the phone number with its country code.' },
    });

    await findByLabelText('Phone number');
    expect(getByText('Enter the phone number with its country code.')).toBeInTheDocument();
  });

  test('shows validation errors for anonymous visitors and only submits once valid', async () => {
    const { getByLabelText, getByRole, mockDoActionFn, getByText } = renderGiftRedemptionPage(Page);
    const emailInput = getByLabelText(/your email/i);
    const submitButton = getByRole('button', { name: buttonLabel });

    fireEvent.click(submitButton);
    expect(getByText('Enter your email address')).toBeInTheDocument();
    expect(mockDoActionFn).not.toHaveBeenCalled();

    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.click(submitButton);
    expect(getByText('Invalid email address')).toBeInTheDocument();
    expect(mockDoActionFn).not.toHaveBeenCalled();

    fireEvent.change(getByLabelText(/your name/i), { target: { value: 'Jamie Larson' } });
    fireEvent.change(emailInput, { target: { value: 'jamie@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockDoActionFn).toHaveBeenCalledWith('redeemGift', {
        email: 'jamie@example.com',
        name: 'Jamie Larson',
        giftToken: 'gift-token-123',
      });
    });
  });

  test('submits on Enter for anonymous visitors', async () => {
    const { getByLabelText, mockDoActionFn } = renderGiftRedemptionPage(Page);
    const emailInput = getByLabelText(/your email/i);

    fireEvent.change(emailInput, { target: { value: 'jamie@example.com' } });
    fireEvent.keyDown(emailInput, { keyCode: 13 });

    await waitFor(() => {
      expect(mockDoActionFn).toHaveBeenCalledWith('redeemGift', {
        email: 'jamie@example.com',
        name: '',
        giftToken: 'gift-token-123',
      });
    });
  });

  test('opens an error notification and closes the popup when gift data is missing', async () => {
    const { mockDoActionFn } = renderGiftRedemptionPage(Page, {
      pageData: {
        token: 'gift-token-123',
        gift: null,
      },
    });

    await waitFor(() => {
      expect(mockDoActionFn).toHaveBeenCalledWith('openNotification', {
        action: 'giftRedemption:failed',
        status: 'error',
        autoHide: false,
        closeable: true,
        message: {
          title: 'Gift could not be redeemed',
          subtitle: 'This gift link is invalid.',
        },
      });
    });

    expect(mockDoActionFn).toHaveBeenCalledWith('closePopup');
  });
});

describe('GiftRedemptionPage details', () => {
  test('shows the intended recipient name when a different member is logged in', () => {
    const personalizedGift = {
      ...gift,
      buyer_name: 'Morgan',
      recipient_name: 'Taylor',
    };
    const { getByText, queryByText } = renderGiftRedemptionPage(GiftRedemptionPage, {
      member: member.free,
      pageData: {
        token: 'gift-token-123',
        gift: personalizedGift,
      },
    });

    expect(getByText('Taylor')).toBeInTheDocument();
    expect(queryByText(member.free.name)).not.toBeInTheDocument();
  });

  test('shows the anonymous introduction for a gift without a buyer name', () => {
    const { container } = renderGiftRedemptionPage(GiftRedemptionPage);

    const subtitle = container.querySelector('.gh-portal-gift-checkout-subtitle');
    expect(subtitle).toHaveTextContent(
      "You've been gifted a 1-year Premium membership to The Blueprint",
    );
    expect(subtitle).toContainHTML('<strong>1-year</strong>');
  });

  test('presents the buyer details and prefills the intended recipient details', async () => {
    const personalizedGift = {
      ...gift,
      buyer_name: 'Jamie',
      recipient_name: 'Taylor',
      recipient_email: 'taylor@example.com',
      message: 'Enjoy this!',
      expires_at: '2030-01-01T00:00:00.000Z',
    };
    const { container, getByLabelText, getByRole, getByTestId, getByText, mockDoActionFn } =
      renderGiftRedemptionPage(GiftRedemptionPage, {
        site: {
          ...testSite,
          url: 'https://example.com/',
          locale: 'en-GB',
          timezone: 'America/Los_Angeles',
        },
        pageData: {
          token: 'gift-token-123',
          gift: personalizedGift,
        },
      });

    expect(getByLabelText(/your name/i)).toHaveValue('Taylor');
    expect(getByLabelText(/your email/i)).toHaveValue('taylor@example.com');
    expect(getByLabelText(/your email/i)).toHaveFocus();
    const subtitle = container.querySelector('.gh-portal-gift-checkout-subtitle');
    expect(subtitle).toHaveTextContent(
      'Jamie has gifted you a 1-year Premium membership to The Blueprint',
    );
    expect(subtitle).toContainHTML('<strong>1-year</strong>');
    expect(getByTestId('gift-message')).toHaveTextContent('Enjoy this!');
    expect(getByTestId('gift-message')).toHaveTextContent('Jamie');
    expect(getByText(/This gift can only be redeemed once and expires on/i)).toBeInTheDocument();

    fireEvent.click(getByRole('button', { name: 'Redeem your gift' }));

    await waitFor(() => {
      expect(mockDoActionFn).toHaveBeenCalledWith('redeemGift', {
        email: 'taylor@example.com',
        name: 'Taylor',
        giftToken: 'gift-token-123',
      });
    });
  });

  test('presents the claim deadline in the publication locale and timezone', () => {
    const personalizedGift = {
      ...gift,
      expires_at: '2030-01-01T01:00:00.000Z',
    };
    const { getByText } = renderGiftRedemptionPage(GiftRedemptionPage, {
      site: {
        ...testSite,
        locale: 'en-GB',
        timezone: 'America/Los_Angeles',
      },
      pageData: {
        token: 'gift-token-123',
        gift: personalizedGift,
      },
    });

    expect(getByText(/expires on 31 Dec 2029\./i)).toBeInTheDocument();
  });
});
