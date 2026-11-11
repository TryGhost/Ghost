import {
  generateAccountPlanFixture,
  getSiteData,
  getProductsData,
  getOfferData,
  getProductData,
  getPriceData,
  getMemberData,
  getSubscriptionData,
} from '../../../../src/utils/fixtures-generator';
import { render, fireEvent } from '../../../utils/test-utils';
import AccountPlanPage from '../../../../src/components/pages/account-plan-page';

const setup = (overrides) => {
  const { mockDoActionFn, context, ...utils } = render(<AccountPlanPage />, {
    overrideContext: {
      ...overrides,
    },
  });
  const monthlyCheckboxEl = utils.getByTestId('monthly-switch');
  const yearlyCheckboxEl = utils.getByTestId('yearly-switch');
  const continueBtn = utils.queryByRole('button', { name: 'Continue' });
  const chooseBtns = utils.queryAllByRole('button', { name: 'Choose' });
  return {
    monthlyCheckboxEl,
    yearlyCheckboxEl,
    continueBtn,
    chooseBtns,
    mockDoActionFn,
    context,
    ...utils,
  };
};

const customSetup = (overrides) => {
  const { mockDoActionFn, context, ...utils } = render(<AccountPlanPage />, {
    overrideContext: {
      ...overrides,
    },
  });

  return {
    mockDoActionFn,
    context,
    ...utils,
  };
};

describe('Account Plan Page', () => {
  test('renders', () => {
    const { monthlyCheckboxEl, yearlyCheckboxEl, queryAllByRole } = setup();
    const continueBtn = queryAllByRole('button', { name: 'Continue' });
    expect(monthlyCheckboxEl).toBeInTheDocument();
    expect(yearlyCheckboxEl).toBeInTheDocument();
    expect(continueBtn).toHaveLength(1);
  });

  test('shows an informative message when no paid plans are available', () => {
    // Reproduces the deep-link / theme-button entry point (#/portal/account/plans)
    // on a site with members enabled but no paid plan configured. Without the
    // empty state the body renders blank under the "Choose a plan" header.
    const siteData = getSiteData({
      paidMembersEnabled: false,
      products: getProductsData({ numOfProducts: 0 }),
    });
    const { getByTestId, queryByTestId } = customSetup({ site: siteData });

    const message = getByTestId('no-plans-available-notification-text');
    expect(message).toBeInTheDocument();
    expect(message).toHaveTextContent('Sorry, no paid plans are available.');

    // The plan selectors should not render in the empty state.
    expect(queryByTestId('monthly-switch')).not.toBeInTheDocument();
    expect(queryByTestId('yearly-switch')).not.toBeInTheDocument();
  });

  test('shows paid plans to complimentary members on non-USD sites', () => {
    // Regression test for https://linear.app/ghost/issue/ONC-1877
    // Ghost core builds a synthetic subscription for comped members with a
    // hardcoded USD currency and an empty price_id (see
    // attachSubscriptionsToMember in member-bread-service.js). Filtering
    // the available prices by that synthetic currency wrongly emptied the
    // plans list on non-USD sites, showing "Sorry, no paid plans are
    // available." instead of the upgrade options.
    const products = [
      getProductData({
        name: 'Bronze',
        monthlyPrice: getPriceData({ interval: 'month', amount: 700, currency: 'eur' }),
        yearlyPrice: getPriceData({ interval: 'year', amount: 7000, currency: 'eur' }),
        numOfBenefits: 2,
      }),
    ];
    const siteData = getSiteData({ products });
    const memberData = getMemberData({
      status: 'comped',
      paid: true,
      subscriptions: [
        getSubscriptionData({
          id: '',
          status: 'active',
          currency: 'USD',
          interval: 'year',
          amount: 0,
          nickname: 'Complimentary',
          priceId: '',
          offer: null,
          tier: products[0],
        }),
      ],
    });
    const { getByTestId, queryByTestId } = customSetup({ site: siteData, member: memberData });

    expect(queryByTestId('no-plans-available-notification-text')).not.toBeInTheDocument();
    expect(getByTestId('monthly-switch')).toBeInTheDocument();
    expect(getByTestId('yearly-switch')).toBeInTheDocument();
  });

  test('can choose plan and continue', async () => {
    const siteData = getSiteData({
      products: getProductsData({ numOfProducts: 1 }),
    });
    const { mockDoActionFn, monthlyCheckboxEl, yearlyCheckboxEl, queryAllByRole } = setup({
      site: siteData,
    });
    const continueBtn = queryAllByRole('button', { name: 'Continue' });

    fireEvent.click(monthlyCheckboxEl);
    expect(monthlyCheckboxEl.className).toEqual('gh-portal-btn active');
    fireEvent.click(yearlyCheckboxEl);
    expect(yearlyCheckboxEl.className).toEqual('gh-portal-btn active');
    fireEvent.click(continueBtn[0]);
    expect(mockDoActionFn).toHaveBeenCalledWith('checkoutPlan', {
      plan: siteData.products[0].yearlyPrice.id,
    });
  });

  test('shows the signup gift promotion to free members choosing a plan', () => {
    const site = {
      ...getSiteData(),
      portal_signup_gift_promotion: true,
    };
    const member = getMemberData({ paid: false });
    const { getByRole, mockDoActionFn } = customSetup({ site, member });

    fireEvent.click(getByRole('button', { name: 'Gift a membership' }));

    expect(mockDoActionFn).toHaveBeenCalledWith('switchPage', {
      page: 'gift',
      lastPage: 'accountPlan',
    });
  });

  test('returns to account home after returning from gift checkout', () => {
    const { getByRole, mockDoActionFn } = customSetup({ lastPage: 'accountPlan' });

    fireEvent.click(getByRole('button', { name: 'Back' }));

    expect(mockDoActionFn).toHaveBeenCalledWith('switchPage', { page: 'accountHome' });
  });

  test.each([
    {
      label: 'the setting is disabled',
      site: {
        ...getSiteData(),
        portal_signup_gift_promotion: false,
      },
    },
    {
      label: 'there is no giftable offering',
      site: {
        ...getSiteData({ portalPlans: ['free'] }),
        portal_signup_gift_promotion: true,
      },
    },
  ])('hides the signup gift promotion when $label', ({ site }) => {
    const member = getMemberData({ paid: false });
    const { queryByRole } = customSetup({ site, member });

    expect(queryByRole('button', { name: 'Gift a membership' })).not.toBeInTheDocument();
  });

  /**
   * A paid member on the first of two tiers, the second of which requires `requirements`, holding
   * `metafields` on their own record.
   */
  const changingToRequiring = (requirements, { metafields = {}, ...overrides } = {}) => {
    const products = getProductsData({ numOfProducts: 2 });
    products[1].requirements = requirements;
    const current = products[0].monthlyPrice;
    const member = {
      ...getMemberData({
        paid: true,
        subscriptions: [
          getSubscriptionData({
            priceId: current.id,
            amount: current.amount,
            currency: current.currency,
            interval: 'month',
          }),
        ],
      }),
      metafields,
    };
    const utils = customSetup({ site: getSiteData({ products }), member, ...overrides });
    // The second tier, as the member is on the first.
    fireEvent.click(utils.getAllByRole('button', { name: 'Choose' })[1]);
    return utils;
  };

  // Listed as the tiers API lists them, by name, which isn't the order Portal asks in, each port
  // naming the field members read its answer from.
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

  test('asks a paid member for what their new tier requires, filled in with what they gave before', async () => {
    const { getByRole, findByLabelText, getByLabelText, mockDoActionFn } = changingToRequiring(
      SHIPPING_AND_PHONE,
      {
        metafields: {
          custom: { recipient_name: 'Ada Lovelace', contact_phone: '+44 7400 123456' },
        },
      },
    );

    const recipient = await findByLabelText('Recipient name');
    expect(recipient).toHaveValue('Ada Lovelace');
    // Shown after the country its code names, as the phone input shows a number held.
    expect(getByLabelText('Country code')).toHaveTextContent('🇬🇧 +44');
    expect(getByLabelText('Phone number')).toHaveValue('7400 123456');
    // Shipping first, then the phone number, whatever order the tier lists them in.
    expect(
      recipient.compareDocumentPosition(getByLabelText('Phone number')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Every input has to hold an answer before the plan can change.
    const confirm = getByRole('button', { name: 'Confirm' });
    expect(confirm).toBeDisabled();

    fireEvent.change(getByLabelText('Address line 1'), { target: { value: '1 High Street' } });
    // Nobody can ship to an address without a country.
    expect(confirm).toBeDisabled();
    fireEvent.change(getByLabelText('Country'), { target: { value: 'GB' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    // Every answer, by the port it's saved through, as the tier requires them all.
    expect(mockDoActionFn).toHaveBeenCalledWith(
      'updateSubscription',
      expect.objectContaining({
        answers: {
          'checkout.shipping.name': 'Ada Lovelace',
          'checkout.shipping.address': { line1: '1 High Street', country: 'GB' },
          'checkout.phone': '+44 7400 123456',
        },
      }),
    );
  });

  // Most members hold no number yet. The phone input starts in the reader's own country, and the
  // number goes as it's dialled at home with that country's code in front, for the site to keep in
  // its international form.
  test('asks a paid member holding no phone number in their own country, and sends it with its code', async () => {
    const languages = vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-GB']);
    try {
      const { getByRole, findByLabelText, getByLabelText, mockDoActionFn } = changingToRequiring([
        SHIPPING_AND_PHONE[0],
      ]);

      const number = await findByLabelText('Phone number');
      expect(number).toHaveValue('');
      expect(getByLabelText('Country code')).toHaveTextContent('🇬🇧 +44');
      const confirm = getByRole('button', { name: 'Confirm' });
      expect(confirm).toBeDisabled();

      fireEvent.change(number, { target: { value: '07400 123456' } });
      fireEvent.click(confirm);

      expect(mockDoActionFn).toHaveBeenCalledWith(
        'updateSubscription',
        expect.objectContaining({ answers: { 'checkout.phone': '+44 07400 123456' } }),
      );
    } finally {
      languages.mockRestore();
    }
  });

  test('sends each answer whole, as it replaces what the member gave before', async () => {
    const { getByRole, findByLabelText, getByLabelText, mockDoActionFn } = changingToRequiring(
      [SHIPPING_AND_PHONE[1]],
      {
        metafields: {
          custom: {
            recipient_name: 'Ada Lovelace',
            delivery_address: { line1: '1 High Street', city: 'London', country: 'GB' },
          },
        },
      },
    );

    await findByLabelText('Recipient name');
    fireEvent.change(getByLabelText('City'), { target: { value: 'Leeds' } });
    fireEvent.click(getByRole('button', { name: 'Confirm' }));

    expect(mockDoActionFn).toHaveBeenCalledWith(
      'updateSubscription',
      expect.objectContaining({
        answers: {
          'checkout.shipping.name': 'Ada Lovelace',
          'checkout.shipping.address': { line1: '1 High Street', city: 'Leeds', country: 'GB' },
        },
      }),
    );
  });

  test('offers only the countries the new tier ships to', async () => {
    const { findByLabelText, getByLabelText } = changingToRequiring([
      { ...SHIPPING_AND_PHONE[1], countries: ['US', 'GB'] },
    ]);

    await findByLabelText('Recipient name');
    const offered = [...getByLabelText('Country').options].map(({ value }) => value);
    expect(offered.filter(Boolean).sort()).toEqual(['GB', 'US']);
  });

  test("doesn't offer a saved country the new tier doesn't ship to, so the member picks one", async () => {
    const { getByRole, findByLabelText, getByLabelText, mockDoActionFn } = changingToRequiring(
      [{ ...SHIPPING_AND_PHONE[1], countries: ['US', 'GB'] }],
      {
        metafields: {
          custom: {
            recipient_name: 'Ada Lovelace',
            delivery_address: { line1: '1 Rue Haute', city: 'Paris', country: 'FR' },
          },
        },
      },
    );

    await findByLabelText('Recipient name');
    const country = getByLabelText('Country');
    expect([...country.options].map(({ value }) => value).filter(Boolean)).not.toContain('FR');
    expect(country).toHaveValue('');
    expect(getByLabelText('Address line 1')).toHaveValue('1 Rue Haute');
    const confirm = getByRole('button', { name: 'Confirm' });
    expect(confirm).toBeDisabled();

    fireEvent.change(country, { target: { value: 'GB' } });
    fireEvent.click(confirm);

    expect(mockDoActionFn).toHaveBeenCalledWith(
      'updateSubscription',
      expect.objectContaining({
        answers: {
          'checkout.shipping.name': 'Ada Lovelace',
          'checkout.shipping.address': { line1: '1 Rue Haute', city: 'Paris', country: 'GB' },
        },
      }),
    );
  });

  test('offers every country when the tier ships anywhere, even where Stripe does not', async () => {
    const { findByLabelText, getByLabelText } = changingToRequiring([SHIPPING_AND_PHONE[1]]);

    await findByLabelText('Recipient name');
    const offered = [...getByLabelText('Country').options].map(({ value }) => value);
    expect(offered).toContain('GB');
    // Somewhere Stripe Checkout won't ship, which Ghost's list of countries holds.
    expect(offered).toContain('CU');
  });

  test("leaves out a requirement this build doesn't know, or knows with other roles, and asks for the rest", async () => {
    const { getByRole, findByLabelText, queryByLabelText, mockDoActionFn } = changingToRequiring(
      [
        { name: 'date_of_birth', ports: { date: { port: 'checkout.date_of_birth' } } },
        // As a newer site might list shipping, with a role this build doesn't ask for.
        {
          ...SHIPPING_AND_PHONE[1],
          ports: {
            ...SHIPPING_AND_PHONE[1].ports,
            instructions: { port: 'checkout.shipping.instructions' },
          },
        },
        SHIPPING_AND_PHONE[0],
      ],
      { metafields: { custom: { contact_phone: '+44 7400 123456' } } },
    );

    expect(await findByLabelText('Phone number')).toHaveValue('7400 123456');
    expect(queryByLabelText('Recipient name')).not.toBeInTheDocument();
    fireEvent.click(getByRole('button', { name: 'Confirm' }));

    // Only what this build asked for, as each requirement is answered whole or not at all.
    expect(mockDoActionFn).toHaveBeenCalledWith(
      'updateSubscription',
      expect.objectContaining({ answers: { 'checkout.phone': '+44 7400 123456' } }),
    );
  });

  test('shows a refused answer on the input that holds it', async () => {
    const { findByText } = changingToRequiring([SHIPPING_AND_PHONE[1]], {
      fieldErrors: {
        'custom:checkout.shipping.address:country': 'Enter a 2-letter country code, like US.',
      },
    });

    expect(
      await findByText('Country: Enter a 2-letter country code, like US.'),
    ).toBeInTheDocument();
  });

  test('forgets a refusal once the member goes back from the confirmation', async () => {
    const { findByText, getByRole, mockDoActionFn } = changingToRequiring([SHIPPING_AND_PHONE[1]], {
      fieldErrors: {
        'custom:checkout.shipping.address:country': 'Enter a 2-letter country code, like US.',
      },
    });
    await findByText('Country: Enter a 2-letter country code, like US.');

    fireEvent.click(getByRole('button', { name: 'Back' }));

    // The inputs it was about are gone, so it mustn't mark the next ones.
    expect(mockDoActionFn).toHaveBeenCalledWith('clearFieldErrors');
  });

  test('asks nothing more when only the billing period changes, as the tier stays the same', async () => {
    const products = getProductsData({ numOfProducts: 2 });
    products[1].requirements = SHIPPING_AND_PHONE;
    const current = products[1].monthlyPrice;
    const member = getMemberData({
      paid: true,
      subscriptions: [
        getSubscriptionData({
          priceId: current.id,
          amount: current.amount,
          currency: current.currency,
          interval: 'month',
        }),
      ],
    });
    const { getByTestId, getAllByRole, getByRole, queryByLabelText, mockDoActionFn } = customSetup({
      site: getSiteData({ products }),
      member,
    });

    fireEvent.click(getByTestId('yearly-switch'));
    // The same tier, yearly.
    fireEvent.click(getAllByRole('button', { name: 'Choose' })[1]);

    expect(queryByLabelText('Phone number')).not.toBeInTheDocument();
    fireEvent.click(getByRole('button', { name: 'Confirm' }));
    expect(mockDoActionFn).toHaveBeenCalledWith(
      'updateSubscription',
      expect.objectContaining({ answers: {} }),
    );
  });

  test('asks nothing more when the new tier requires nothing', async () => {
    const products = getProductsData({ numOfProducts: 2 });
    const current = products[0].monthlyPrice;
    const member = getMemberData({
      paid: true,
      subscriptions: [
        getSubscriptionData({
          priceId: current.id,
          amount: current.amount,
          currency: current.currency,
          interval: 'month',
        }),
      ],
    });
    const { getAllByRole, getByRole, queryByLabelText, mockDoActionFn } = customSetup({
      site: getSiteData({ products }),
      member,
    });

    // The second tier, as the member is on the first.
    fireEvent.click(getAllByRole('button', { name: 'Choose' })[1]);

    expect(queryByLabelText('Recipient name')).not.toBeInTheDocument();
    fireEvent.click(getByRole('button', { name: 'Confirm' }));
    expect(mockDoActionFn).toHaveBeenCalledWith(
      'updateSubscription',
      expect.objectContaining({ answers: {} }),
    );
  });

  test('can cancel subscription for member on hidden tier', async () => {
    const overrides = generateAccountPlanFixture();
    const { queryByRole, queryByText } = customSetup(overrides);
    const cancelButton = queryByRole('button', { name: 'Cancel subscription' });
    expect(cancelButton).toBeInTheDocument();
    fireEvent.click(cancelButton);

    // Check that the cancellation message is present
    const cancellationMessage = queryByText(
      /If you cancel your subscription now, you will continue to have access until/i,
    );
    expect(cancellationMessage).toBeInTheDocument();

    // Ensure the message doesn't contain the raw interpolation placeholder
    expect(cancellationMessage.textContent).not.toContain('{periodEnd}');

    const confirmCancelButton = queryByRole('button', { name: 'Confirm cancellation' });
    expect(confirmCancelButton).toBeInTheDocument();
  });

  test('triggers cancellation flow when opened with cancel pageData', () => {
    const overrides = generateAccountPlanFixture();
    const subscriptionId = overrides.member.subscriptions[0].id;
    const { queryByText, queryByRole } = customSetup({
      ...overrides,
      pageData: { action: 'cancel', subscriptionId },
    });

    // Should immediately show cancellation confirmation
    const cancellationMessage = queryByText(
      /If you cancel your subscription now, you will continue to have access until/i,
    );
    expect(cancellationMessage).toBeInTheDocument();

    const confirmCancelButton = queryByRole('button', { name: 'Confirm cancellation' });
    expect(confirmCancelButton).toBeInTheDocument();
  });

  test('shows retention offer during cancellation flow', async () => {
    const paidProduct = getProductData({
      name: 'Basic',
      monthlyPrice: getPriceData({ interval: 'month', amount: 1000, currency: 'usd' }),
      yearlyPrice: getPriceData({ interval: 'year', amount: 10000, currency: 'usd' }),
    });
    const products = [paidProduct, getProductData({ type: 'free' })];
    const site = getSiteData({
      products,
      portalProducts: [paidProduct.id],
    });
    const member = getMemberData({
      paid: true,
      subscriptions: [
        getSubscriptionData({
          status: 'active',
          interval: 'month',
          amount: paidProduct.monthlyPrice.amount,
          currency: 'USD',
          priceId: paidProduct.monthlyPrice.id,
        }),
      ],
    });
    const subscriptionId = member.subscriptions[0].id;
    const retentionOffer = getOfferData({
      redemptionType: 'retention',
      name: 'Stay with us',
      amount: 20,
      type: 'percent',
      cadence: 'month',
      tierId: paidProduct.id,
      tierName: paidProduct.name,
    });
    const { findByRole } = customSetup({
      site,
      member,
      offers: [retentionOffer],
      pageData: { action: 'cancel', subscriptionId },
    });

    // Should show retention offer section instead of cancellation confirmation
    const acceptOfferButton = await findByRole('button', { name: 'Continue subscription' });
    expect(acceptOfferButton).toBeInTheDocument();
  });

  test('shows retention offer during cancellation flow for members on an archived tier', async () => {
    const paidTier = getProductData({
      name: 'Basic',
      monthlyPrice: getPriceData({ interval: 'month', amount: 1000, currency: 'usd' }),
      yearlyPrice: getPriceData({ interval: 'year', amount: 10000, currency: 'usd' }),
    });

    const archivedTier = getProductData({
      name: 'Archived',
      monthlyPrice: getPriceData({ interval: 'month', amount: 1000, currency: 'usd' }),
      yearlyPrice: getPriceData({ interval: 'year', amount: 10000, currency: 'usd' }),
    });

    // As archived products are not returned by the /tiers endpoint, omit archivedTier
    const site = getSiteData({
      products: [paidTier, getProductData({ type: 'free' })],
      portalProducts: [paidTier.id],
    });

    // Subscription is linked to archivedTier
    const subscription = getSubscriptionData({
      status: 'active',
      interval: 'month',
      amount: 1200,
      currency: 'USD',
      priceId: archivedTier.monthlyPrice.id,
      tier: {
        id: archivedTier.id,
        name: archivedTier.name,
      },
    });
    subscription.price.product.product_id = subscription.tier.id;

    const member = getMemberData({
      paid: true,
      subscriptions: [subscription],
    });

    const retentionOffer = {
      ...getOfferData({
        redemptionType: 'retention',
        type: 'percent',
        amount: 20,
        cadence: 'month',
      }),
      tier: null,
    };

    const { findByRole, queryByText } = customSetup({
      site,
      member,
      offers: [retentionOffer],
      pageData: { action: 'cancel', subscriptionId: subscription.id },
    });

    const acceptOfferButton = await findByRole('button', { name: 'Continue subscription' });
    expect(acceptOfferButton).toBeInTheDocument();
    expect(queryByText(`${archivedTier.name} - Monthly`)).toBeInTheDocument();
  });

  test('refreshes retention preview details when offer context changes', () => {
    const paidProduct = getProductData({
      name: 'Basic',
      monthlyPrice: getPriceData({ interval: 'month', amount: 1000, currency: 'usd' }),
      yearlyPrice: getPriceData({ interval: 'year', amount: 10000, currency: 'usd' }),
    });
    const products = [paidProduct, getProductData({ type: 'free' })];
    const site = getSiteData({
      products,
      portalProducts: [paidProduct.id],
    });
    const member = getMemberData({
      paid: true,
      subscriptions: [
        getSubscriptionData({
          status: 'active',
          interval: 'month',
          amount: paidProduct.monthlyPrice.amount,
          currency: 'USD',
          priceId: paidProduct.monthlyPrice.id,
        }),
      ],
    });
    const subscriptionId = member.subscriptions[0].id;

    const firstOffer = getOfferData({
      redemptionType: 'retention',
      displayTitle: 'First retention title',
      displayDescription: 'First retention description',
      type: 'percent',
      amount: 10,
      cadence: 'month',
      tierId: paidProduct.id,
      tierName: paidProduct.name,
    });
    const secondOffer = {
      ...firstOffer,
      amount: 25,
      display_title: 'Second retention title',
      display_description: 'Second retention description',
    };

    const { queryByText, context, rerender } = customSetup({
      site,
      member,
      offers: [firstOffer],
      pageData: { action: 'cancel', subscriptionId },
    });

    expect(queryByText('First retention title')).toBeInTheDocument();
    expect(queryByText('10% off')).toBeInTheDocument();

    context.offers = [secondOffer];
    context.pageData = { action: 'cancel', subscriptionId };
    rerender(<AccountPlanPage />);

    expect(queryByText('Second retention title')).toBeInTheDocument();
    expect(queryByText('25% off')).toBeInTheDocument();
  });

  test('clears pageData after triggering cancellation so it does not re-trigger on remount', () => {
    const overrides = generateAccountPlanFixture();
    const subscriptionId = overrides.member.subscriptions[0].id;
    const pageData = { action: 'cancel', subscriptionId };

    // First mount: should trigger cancellation flow
    const { unmount, queryByText } = customSetup({
      ...overrides,
      pageData,
    });

    const cancellationMessage = queryByText(
      /If you cancel your subscription now, you will continue to have access until/i,
    );
    expect(cancellationMessage).toBeInTheDocument();

    // pageData.action should have been cleared
    expect(pageData.action).toBeNull();

    unmount();

    // Second mount with the same pageData object: should NOT trigger cancellation flow
    const { queryByText: queryByText2, queryByRole: queryByRole2 } = customSetup({
      ...overrides,
      pageData,
    });

    const cancellationMessage2 = queryByText2(/If you cancel your subscription now/i);
    expect(cancellationMessage2).not.toBeInTheDocument();

    // Should show the normal plan page
    const cancelButton = queryByRole2('button', { name: 'Cancel subscription' });
    expect(cancelButton).toBeInTheDocument();
  });

  test('does not trigger cancellation flow when pageData has no cancel action', () => {
    const overrides = generateAccountPlanFixture();
    const { queryByText, queryByRole } = customSetup({
      ...overrides,
      pageData: { someOtherData: true },
    });

    // Should not show cancellation confirmation
    const cancellationMessage = queryByText(/If you cancel your subscription now/i);
    expect(cancellationMessage).not.toBeInTheDocument();

    // Should show the normal plan page with cancel button available
    const cancelButton = queryByRole('button', { name: 'Cancel subscription' });
    expect(cancelButton).toBeInTheDocument();
  });

  test('renders percent retention offers', async () => {
    const paidProduct = getProductData({
      name: 'Basic',
      monthlyPrice: getPriceData({ interval: 'month', amount: 1000, currency: 'usd' }),
      yearlyPrice: getPriceData({ interval: 'year', amount: 10000, currency: 'usd' }),
    });
    const products = [paidProduct, getProductData({ type: 'free' })];
    const site = getSiteData({
      products,
      portalProducts: [paidProduct.id],
    });
    const member = getMemberData({
      paid: true,
      subscriptions: [
        getSubscriptionData({
          status: 'active',
          interval: 'month',
          amount: paidProduct.monthlyPrice.amount,
          currency: 'USD',
          priceId: paidProduct.monthlyPrice.id,
        }),
      ],
    });

    const retentionOffer = {
      ...getOfferData({
        type: 'percent',
        amount: 20,
        cadence: 'month',
        duration: 'once',
        tierId: paidProduct.id,
        tierName: paidProduct.name,
      }),
      redemption_type: 'retention',
    };

    const { queryByRole, queryByText } = customSetup({ site, member, offers: [retentionOffer] });
    const cancelButton = queryByRole('button', { name: 'Cancel subscription' });

    fireEvent.click(cancelButton);

    expect(queryByText('20% off')).toBeInTheDocument();
    expect(queryByText('Save 20% on your next billing cycle. Then $10/month.')).toBeInTheDocument();
  });

  test('renders yearly retention offers', async () => {
    const paidProduct = getProductData({
      name: 'Basic',
      monthlyPrice: getPriceData({ interval: 'month', amount: 1000, currency: 'usd' }),
      yearlyPrice: getPriceData({ interval: 'year', amount: 10000, currency: 'usd' }),
    });
    const products = [paidProduct, getProductData({ type: 'free' })];
    const site = getSiteData({
      products,
      portalProducts: [paidProduct.id],
    });
    const member = getMemberData({
      paid: true,
      subscriptions: [
        getSubscriptionData({
          status: 'active',
          interval: 'year',
          amount: paidProduct.yearlyPrice.amount,
          currency: 'USD',
          priceId: paidProduct.yearlyPrice.id,
        }),
      ],
    });

    const retentionOffer = {
      ...getOfferData({
        type: 'percent',
        amount: 20,
        cadence: 'year',
        duration: 'once',
        tierId: paidProduct.id,
        tierName: paidProduct.name,
      }),
      redemption_type: 'retention',
    };

    const { queryByRole, queryByText } = customSetup({ site, member, offers: [retentionOffer] });
    const cancelButton = queryByRole('button', { name: 'Cancel subscription' });

    fireEvent.click(cancelButton);

    expect(queryByText('20% off')).toBeInTheDocument();
    expect(queryByText('Save 20% on your next billing cycle. Then $100/year.')).toBeInTheDocument();
  });

  test('renders rounded cents for percent retention offers', async () => {
    const paidProduct = getProductData({
      name: 'Basic',
      monthlyPrice: getPriceData({ interval: 'month', amount: 599, currency: 'usd' }),
      yearlyPrice: getPriceData({ interval: 'year', amount: 10000, currency: 'usd' }),
    });
    const products = [paidProduct, getProductData({ type: 'free' })];
    const site = getSiteData({
      products,
      portalProducts: [paidProduct.id],
    });
    const member = getMemberData({
      paid: true,
      subscriptions: [
        getSubscriptionData({
          status: 'active',
          interval: 'month',
          amount: paidProduct.monthlyPrice.amount,
          currency: 'USD',
          priceId: paidProduct.monthlyPrice.id,
        }),
      ],
    });

    const retentionOffer = {
      ...getOfferData({
        type: 'percent',
        amount: 20,
        cadence: 'month',
        duration: 'once',
        tierId: paidProduct.id,
        tierName: paidProduct.name,
      }),
      redemption_type: 'retention',
    };

    const { container, queryByRole, queryByText } = customSetup({
      site,
      member,
      offers: [retentionOffer],
    });
    const cancelButton = queryByRole('button', { name: 'Cancel subscription' });

    fireEvent.click(cancelButton);

    const discountedAmount = container.querySelector('.gh-portal-product-price .amount');
    expect(discountedAmount).not.toBeNull();
    expect(discountedAmount).toHaveTextContent('4.79');
    expect(
      queryByText('Save 20% on your next billing cycle. Then $5.99/month.'),
    ).toBeInTheDocument();
  });

  test('renders grouped and padded prices for larger fractional retention offers', async () => {
    const paidProduct = getProductData({
      name: 'Basic',
      monthlyPrice: getPriceData({ interval: 'month', amount: 123450, currency: 'usd' }),
      yearlyPrice: getPriceData({ interval: 'year', amount: 10000, currency: 'usd' }),
    });
    const products = [paidProduct, getProductData({ type: 'free' })];
    const site = getSiteData({
      products,
      portalProducts: [paidProduct.id],
    });
    const member = getMemberData({
      paid: true,
      subscriptions: [
        getSubscriptionData({
          status: 'active',
          interval: 'month',
          amount: paidProduct.monthlyPrice.amount,
          currency: 'USD',
          priceId: paidProduct.monthlyPrice.id,
        }),
      ],
    });

    const retentionOffer = {
      ...getOfferData({
        type: 'percent',
        amount: 20,
        cadence: 'month',
        duration: 'once',
        tierId: paidProduct.id,
        tierName: paidProduct.name,
      }),
      redemption_type: 'retention',
    };

    const { container, queryByRole, queryByText } = customSetup({
      site,
      member,
      offers: [retentionOffer],
    });
    const cancelButton = queryByRole('button', { name: 'Cancel subscription' });

    fireEvent.click(cancelButton);

    const discountedAmount = container.querySelector('.gh-portal-product-price .amount');
    expect(discountedAmount).not.toBeNull();
    expect(discountedAmount).toHaveTextContent('987.60');
    expect(
      queryByText('Save 20% on your next billing cycle. Then $1,234.50/month.'),
    ).toBeInTheDocument();
  });

  test('renders fixed retention offers', async () => {
    const paidProduct = getProductData({
      name: 'Basic',
      monthlyPrice: getPriceData({ interval: 'month', amount: 1000, currency: 'usd' }),
      yearlyPrice: getPriceData({ interval: 'year', amount: 10000, currency: 'usd' }),
    });
    const products = [paidProduct, getProductData({ type: 'free' })];
    const site = getSiteData({
      products,
      portalProducts: [paidProduct.id],
    });
    const member = getMemberData({
      paid: true,
      subscriptions: [
        getSubscriptionData({
          status: 'active',
          interval: 'month',
          amount: paidProduct.monthlyPrice.amount,
          currency: 'USD',
          priceId: paidProduct.monthlyPrice.id,
        }),
      ],
    });

    const retentionOffer = {
      ...getOfferData({
        type: 'fixed',
        amount: 300,
        cadence: 'month',
        duration: 'once',
        currency: 'USD',
        tierId: paidProduct.id,
        tierName: paidProduct.name,
      }),
      redemption_type: 'retention',
    };

    const { queryByRole, queryByText } = customSetup({ site, member, offers: [retentionOffer] });
    const cancelButton = queryByRole('button', { name: 'Cancel subscription' });

    fireEvent.click(cancelButton);

    expect(queryByText('$3 off')).toBeInTheDocument();
    expect(queryByText('Save $3 on your next billing cycle. Then $10/month.')).toBeInTheDocument();
  });

  test('renders free months retention offers', async () => {
    const paidProduct = getProductData({
      name: 'Basic',
      monthlyPrice: getPriceData({ interval: 'month', amount: 1000, currency: 'usd' }),
      yearlyPrice: getPriceData({ interval: 'year', amount: 10000, currency: 'usd' }),
    });
    const products = [paidProduct, getProductData({ type: 'free' })];
    const site = getSiteData({
      products,
      portalProducts: [paidProduct.id],
    });
    const member = getMemberData({
      paid: true,
      subscriptions: [
        getSubscriptionData({
          status: 'active',
          interval: 'month',
          amount: paidProduct.monthlyPrice.amount,
          currency: 'USD',
          priceId: paidProduct.monthlyPrice.id,
        }),
      ],
    });

    const retentionOffer = {
      ...getOfferData({
        type: 'percent',
        amount: 100,
        cadence: 'month',
        duration: 'repeating',
        durationInMonths: 1,
        tierId: paidProduct.id,
        tierName: paidProduct.name,
      }),
      redemption_type: 'retention',
    };

    const { queryByRole, queryByText } = customSetup({ site, member, offers: [retentionOffer] });
    const cancelButton = queryByRole('button', { name: 'Cancel subscription' });

    fireEvent.click(cancelButton);

    expect(queryByText('1 month free')).toBeInTheDocument();
    expect(
      queryByText("Enjoy a free month on us. You won't be charged until 5 Nov 2022."),
    ).toBeInTheDocument();
  });

  test('renders multi-month free months retention offers', async () => {
    const paidProduct = getProductData({
      name: 'Basic',
      monthlyPrice: getPriceData({ interval: 'month', amount: 1000, currency: 'usd' }),
      yearlyPrice: getPriceData({ interval: 'year', amount: 10000, currency: 'usd' }),
    });
    const products = [paidProduct, getProductData({ type: 'free' })];
    const site = getSiteData({
      products,
      portalProducts: [paidProduct.id],
    });
    const member = getMemberData({
      paid: true,
      subscriptions: [
        getSubscriptionData({
          status: 'active',
          interval: 'month',
          amount: paidProduct.monthlyPrice.amount,
          currency: 'USD',
          priceId: paidProduct.monthlyPrice.id,
        }),
      ],
    });

    const retentionOffer = {
      ...getOfferData({
        type: 'percent',
        amount: 100,
        cadence: 'month',
        duration: 'repeating',
        durationInMonths: 3,
        tierId: paidProduct.id,
        tierName: paidProduct.name,
      }),
      redemption_type: 'retention',
    };

    const { queryByRole, queryByText } = customSetup({ site, member, offers: [retentionOffer] });
    const cancelButton = queryByRole('button', { name: 'Cancel subscription' });

    fireEvent.click(cancelButton);

    expect(queryByText('3 months free')).toBeInTheDocument();
    expect(
      queryByText("Enjoy 3 free months on us. You won't be charged until 5 Jan 2023."),
    ).toBeInTheDocument();
  });

  test('renders forever percent retention offers', async () => {
    const paidProduct = getProductData({
      name: 'Basic',
      monthlyPrice: getPriceData({ interval: 'month', amount: 1000, currency: 'usd' }),
      yearlyPrice: getPriceData({ interval: 'year', amount: 10000, currency: 'usd' }),
    });
    const products = [paidProduct, getProductData({ type: 'free' })];
    const site = getSiteData({
      products,
      portalProducts: [paidProduct.id],
    });
    const member = getMemberData({
      paid: true,
      subscriptions: [
        getSubscriptionData({
          status: 'active',
          interval: 'month',
          amount: paidProduct.monthlyPrice.amount,
          currency: 'USD',
          priceId: paidProduct.monthlyPrice.id,
        }),
      ],
    });

    const retentionOffer = {
      ...getOfferData({
        type: 'percent',
        amount: 20,
        cadence: 'month',
        duration: 'forever',
        tierId: paidProduct.id,
        tierName: paidProduct.name,
      }),
      redemption_type: 'retention',
    };

    const { queryByRole, queryByText } = customSetup({ site, member, offers: [retentionOffer] });
    const cancelButton = queryByRole('button', { name: 'Cancel subscription' });

    fireEvent.click(cancelButton);

    expect(queryByText('20% off')).toBeInTheDocument();
    expect(queryByText('Enjoy 20% off forever.')).toBeInTheDocument();
  });

  test('renders repeating percent offers', async () => {
    const paidProduct = getProductData({
      name: 'Basic',
      monthlyPrice: getPriceData({ interval: 'month', amount: 1000, currency: 'usd' }),
      yearlyPrice: getPriceData({ interval: 'year', amount: 10000, currency: 'usd' }),
    });
    const products = [paidProduct, getProductData({ type: 'free' })];
    const site = getSiteData({
      products,
      portalProducts: [paidProduct.id],
    });
    const member = getMemberData({
      paid: true,
      subscriptions: [
        getSubscriptionData({
          status: 'active',
          interval: 'month',
          amount: paidProduct.monthlyPrice.amount,
          currency: 'USD',
          priceId: paidProduct.monthlyPrice.id,
        }),
      ],
    });

    const retentionOffer = {
      ...getOfferData({
        type: 'percent',
        amount: 20,
        cadence: 'month',
        duration: 'repeating',
        durationInMonths: 3,
        tierId: paidProduct.id,
        tierName: paidProduct.name,
      }),
      redemption_type: 'retention',
    };

    const { queryByRole, queryByText } = customSetup({ site, member, offers: [retentionOffer] });
    const cancelButton = queryByRole('button', { name: 'Cancel subscription' });

    fireEvent.click(cancelButton);

    expect(queryByText('20% off')).toBeInTheDocument();
    expect(
      queryByText('Save 20% on your next 3 billing cycles. Then $10/month.'),
    ).toBeInTheDocument();
  });

  describe('gift members', () => {
    const buildGiftMember = ({ tier }) => {
      const subscription = getSubscriptionData({
        status: 'active',
        interval: 'month',
        amount: 1200,
        currency: 'USD',
        priceId: '',
        tier: {
          id: tier.id,
          name: tier.name,
          expiry_at: '2027-01-11T00:00:00.000Z',
        },
      });
      subscription.id = '';
      subscription.price.id = '';
      subscription.price.product.product_id = tier.id;

      return getMemberData({
        status: 'gift',
        paid: true,
        subscriptions: [subscription],
      });
    };

    describe('on an archived tier', () => {
      test('hides the Cancel subscription button and allows to upgrade to a new plan', async () => {
        const premiumTier = getProductData({
          name: 'Premium',
          monthlyPrice: getPriceData({ interval: 'month', amount: 1500, currency: 'usd' }),
          yearlyPrice: getPriceData({ interval: 'year', amount: 15000, currency: 'usd' }),
        });
        const ultraTier = getProductData({
          name: 'Ultra',
          monthlyPrice: getPriceData({ interval: 'month', amount: 2500, currency: 'usd' }),
          yearlyPrice: getPriceData({ interval: 'year', amount: 25000, currency: 'usd' }),
        });

        const archivedTier = getProductData({
          name: 'Archived Tier',
          monthlyPrice: getPriceData({ interval: 'month', amount: 1200, currency: 'usd' }),
          yearlyPrice: getPriceData({ interval: 'year', amount: 12000, currency: 'usd' }),
        });

        // Archived tiers are filtered out of site.products by the backend
        const site = getSiteData({
          products: [premiumTier, ultraTier, getProductData({ type: 'free' })],
          portalProducts: [premiumTier.id, ultraTier.id],
        });

        const member = buildGiftMember({ tier: archivedTier });

        const { queryByRole, queryAllByRole, mockDoActionFn } = customSetup({ site, member });

        expect(queryByRole('button', { name: 'Cancel subscription' })).not.toBeInTheDocument();
        expect(queryByRole('button', { name: 'Confirm cancellation' })).not.toBeInTheDocument();

        const chooseButtons = queryAllByRole('button', { name: 'Choose' });
        expect(chooseButtons.length).toBeGreaterThan(0);

        fireEvent.click(chooseButtons[0]);

        expect(mockDoActionFn).toHaveBeenCalledWith(
          'checkoutPlan',
          expect.objectContaining({ plan: expect.any(String) }),
        );
        expect(mockDoActionFn).not.toHaveBeenCalledWith('updateSubscription', expect.anything());
        expect(mockDoActionFn).not.toHaveBeenCalledWith('cancelSubscription', expect.anything());
      });
    });

    describe('on an active tier', () => {
      test('hides the cancellations button and allows to continue on the same tier', () => {
        const activeTier = getProductData({
          name: 'Basic',
          monthlyPrice: getPriceData({ interval: 'month', amount: 1200, currency: 'usd' }),
          yearlyPrice: getPriceData({ interval: 'year', amount: 12000, currency: 'usd' }),
        });
        const otherTier = getProductData({
          name: 'Premium',
          monthlyPrice: getPriceData({ interval: 'month', amount: 2000, currency: 'usd' }),
          yearlyPrice: getPriceData({ interval: 'year', amount: 20000, currency: 'usd' }),
        });

        const site = getSiteData({
          products: [activeTier, otherTier, getProductData({ type: 'free' })],
          portalProducts: [activeTier.id, otherTier.id],
        });

        const member = buildGiftMember({ tier: activeTier });

        const { mockDoActionFn, queryByRole } = customSetup({ site, member });

        // No "Cancel subscription" — gift subs cannot be cancelled.
        expect(queryByRole('button', { name: 'Cancel subscription' })).not.toBeInTheDocument();

        // Active-tier gift members are bounced back to AccountHomePage where their only
        // option is to "Continue" on the same tier (via continueGiftSubscription). The
        // change-plan UI is not available to them.
        expect(mockDoActionFn).toHaveBeenCalledWith('switchPage', { page: 'accountHome' });
        expect(mockDoActionFn).not.toHaveBeenCalledWith('checkoutPlan', expect.anything());
        expect(mockDoActionFn).not.toHaveBeenCalledWith('updateSubscription', expect.anything());
      });
    });
  });
});
