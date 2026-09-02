import { fireEvent, render, waitFor } from '../../../utils/test-utils';
import BetaGiftPage from '../../../../src/components/pages/beta-gift-page';
import {
  GIFT_FORM_STATE_KEY,
  createGiftFormState,
} from '../../../../src/components/pages/beta-gift/form-state';
import {
  getPriceData,
  getProductData,
  getSiteData,
} from '../../../../src/utils/fixtures-generator';

type SiteData = ReturnType<typeof getSiteData>;

function buildSite(overrides: Partial<Parameters<typeof getSiteData>[0]> = {}) {
  const product = getProductData({
    id: 'tier_123',
    name: 'Premium',
    monthlyPrice: getPriceData({ amount: 500, interval: 'month' }),
    yearlyPrice: getPriceData({ amount: 5000, interval: 'year' }),
  });

  return getSiteData({
    products: [product],
    portalProducts: [product.id],
    portalDefaultPlan: 'monthly',
    ...overrides,
  });
}

function setup(site: SiteData, overrideContext: Record<string, unknown> = {}) {
  return render(<BetaGiftPage />, {
    overrideContext: {
      site,
      member: {
        email: 'buyer@example.com',
        status: 'free',
      },
      ...overrideContext,
    },
  });
}

describe('BetaGiftPage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  test('preserves focus on the checkout action when moving to delivery', () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const { getByLabelText, getByRole } = setup(site);
    const continueButton = getByRole('button', { name: 'Continue to delivery details' });

    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    continueButton.focus();
    fireEvent.click(continueButton);

    const paymentButton = getByRole('button', { name: 'Continue to payment' });
    expect(paymentButton).toBe(continueButton);
    expect(paymentButton).toHaveFocus();
  });

  test.each([
    { pickerLabel: '1 month', durationLabel: '1-month' },
    { pickerLabel: '3 months', durationLabel: '3-month' },
    { pickerLabel: '6 months', durationLabel: '6-month' },
    { pickerLabel: '1 year', durationLabel: '1-year' },
  ])('bolds the complete $durationLabel gift duration', ({ pickerLabel, durationLabel }) => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const { container, getByLabelText, getByRole } = setup(site);

    fireEvent.click(getByRole('radio', { name: pickerLabel }));
    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));

    expect(container.querySelector('.gh-portal-gift-email-lede')).toContainHTML(
      `<strong>${durationLabel}</strong>`,
    );
  });

  test('returns an incomplete direct delivery route to the plan step', () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const { getByRole, queryByLabelText } = setup(site, {
      pageData: { giftStep: 'delivery' },
    });

    expect(getByRole('heading', { name: 'Gift a membership' })).toBeInTheDocument();
    expect(queryByLabelText("Recipient's email")).not.toBeInTheDocument();
    expect(window.location.hash).toBe('#/portal/gift');
  });

  test('creates a plan history entry before navigating an internal flow to delivery', async () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    window.history.pushState(null, '', '#/portal/signup');
    const { getByLabelText, getByRole } = setup(site, { lastPage: 'signup' });

    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));
    expect(window.location.hash).toBe('#/portal/gift/delivery');

    window.history.back();

    await waitFor(() => expect(window.location.hash).toBe('#/portal/gift'));

    window.history.back();

    await waitFor(() => expect(window.location.hash).toBe('#/portal/signup'));
  });

  test('preserves the original fragment when navigating through the gift form', async () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    window.history.pushState(null, '', '/post#comments');
    const { getByLabelText, getByRole } = setup(site);

    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));
    expect(window.location.hash).toBe('#/portal/gift/delivery');

    window.history.back();
    await waitFor(() => expect(window.location.hash).toBe('#/portal/gift'));

    window.history.back();
    await waitFor(() => expect(window.location.hash).toBe('#comments'));
  });

  test('restores the internal entry route when leaving the plan', async () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    window.history.pushState(null, '', '#/portal/signup');
    const { getByLabelText, getByRole, mockDoActionFn } = setup(site, { lastPage: 'signup' });

    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));
    fireEvent.click(getByRole('button', { name: /Back/ }));
    await waitFor(() => expect(window.location.hash).toBe('#/portal/gift'));
    fireEvent.click(getByRole('button', { name: /Back/ }));

    await waitFor(() => expect(window.location.hash).toBe('#/portal/signup'));
    expect(mockDoActionFn).toHaveBeenCalledWith('back');

    window.history.back();
    await waitFor(() => expect(window.location.hash).toBe(''));
  });

  test('restores the Account Plans route when leaving the plan', async () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    window.history.pushState(null, '', '#/portal/account/plans');
    const { getByLabelText, getByRole, mockDoActionFn } = setup(site, {
      lastPage: 'accountPlan',
    });

    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));
    fireEvent.click(getByRole('button', { name: /Back/ }));
    await waitFor(() => expect(window.location.hash).toBe('#/portal/gift'));
    fireEvent.click(getByRole('button', { name: /Back/ }));

    await waitFor(() => expect(window.location.hash).toBe('#/portal/account/plans'));
    expect(mockDoActionFn).toHaveBeenCalledWith('back');
  });

  test('dispatches the shared close action when the form is closed', () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const { getByLabelText, getByRole, mockDoActionFn } = setup(site);

    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    expect(window.sessionStorage.getItem(GIFT_FORM_STATE_KEY)).not.toBeNull();

    fireEvent.click(getByRole('button', { name: 'Close popup' }));

    expect(mockDoActionFn).toHaveBeenCalledWith('closePopup');
  });

  test('keeps the form usable when session storage is unavailable', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });
    const site = buildSite({ labs: { giftSubCustomization: true } });

    const { getByLabelText } = setup(site);
    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });

    expect(getByLabelText('Your name')).toHaveValue('Jamie');
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  test('restores delivery details after the page remounts', () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const firstRender = setup(site);

    fireEvent.click(firstRender.getByRole('radio', { name: '3 months' }));
    fireEvent.change(firstRender.getByLabelText('Your name'), { target: { value: 'Jamie' } });
    fireEvent.click(firstRender.getByRole('button', { name: 'Continue to delivery details' }));
    fireEvent.change(firstRender.getByLabelText("Recipient's name"), {
      target: { value: 'Taylor' },
    });
    fireEvent.change(firstRender.getByLabelText("Recipient's email"), {
      target: { value: 'recipient@example.com' },
    });
    fireEvent.change(firstRender.getByLabelText('Optional message'), {
      target: { value: 'Enjoy!' },
    });
    firstRender.unmount();

    const restoredRender = setup(site, { pageData: { giftStep: 'delivery' } });

    expect(restoredRender.container.querySelector('.gh-portal-gift-email-lede')).toHaveTextContent(
      'Jamie has gifted you a 3-month Premium membership to The Blueprint',
    );
    expect(restoredRender.getByLabelText("Recipient's name")).toHaveValue('Taylor');
    expect(restoredRender.getByLabelText("Recipient's email")).toHaveValue('recipient@example.com');
    expect(restoredRender.getByLabelText('Optional message')).toHaveValue('Enjoy!');
  });

  test('returns an expired signed-in draft to the visible buyer email field', () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const productId = site.products[0].id;
    const draft = createGiftFormState({ buyerName: 'Jamie' });
    draft.plan.selectedDuration = 1;
    draft.plan.selectedProductId = productId;
    draft.plan.completed = true;
    draft.delivery.method = 'link';
    window.sessionStorage.setItem(GIFT_FORM_STATE_KEY, JSON.stringify(draft));

    const { getByLabelText, getByRole, getByText } = setup(site, {
      member: null,
      pageData: { giftStep: 'delivery' },
    });

    fireEvent.click(getByRole('button', { name: 'Continue to payment' }));

    expect(getByLabelText('Your email')).toBeInTheDocument();
    expect(getByText('Enter your email address')).toBeInTheDocument();
  });

  test('offers the full fixed-duration catalogue and updates the price and request', () => {
    const site = buildSite({
      labs: {
        giftSubCustomization: true,
      },
    });
    const { container, getAllByText, getByLabelText, getByRole, mockDoActionFn } = setup(site);

    expect(getByRole('radio', { name: '1 month' })).toHaveAttribute('aria-checked', 'true');
    expect(getByRole('radio', { name: '3 months' })).toHaveAttribute('aria-checked', 'false');
    expect(getByRole('radio', { name: '6 months' })).toBeInTheDocument();
    expect(getByRole('radio', { name: '1 year' })).toBeInTheDocument();
    expect(getAllByText('$5').length).toBeGreaterThan(0);

    fireEvent.click(getByRole('radio', { name: '3 months' }));

    expect(getByRole('radio', { name: '1 month' })).toHaveAttribute('aria-checked', 'false');
    expect(getByRole('radio', { name: '3 months' })).toHaveAttribute('aria-checked', 'true');
    expect(getAllByText('$15').length).toBeGreaterThan(0);

    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));
    expect(container.querySelector('.gh-portal-gift-email-lede')).toHaveTextContent(
      'Jamie has gifted you a 3-month Premium membership to The Blueprint',
    );
    fireEvent.change(getByLabelText("Recipient's name"), { target: { value: 'Taylor' } });
    fireEvent.change(getByLabelText("Recipient's email"), {
      target: { value: 'recipient@example.com' },
    });
    fireEvent.change(getByLabelText('Optional message'), { target: { value: 'Enjoy!' } });
    fireEvent.click(getByRole('button', { name: 'Continue to payment' }));

    expect(mockDoActionFn).toHaveBeenCalledWith('checkoutGift', {
      tierId: 'tier_123',
      duration: 3,
      deliveryMethod: 'email',
      recipientEmail: 'recipient@example.com',
      recipientName: 'Taylor',
      buyerName: 'Jamie',
      personalMessage: 'Enjoy!',
    });
  });

  test('defaults to a year for a yearly Portal default', () => {
    const site = buildSite({
      labs: {
        giftSubCustomization: true,
      },
      portalDefaultPlan: 'yearly',
    });
    const { container, getByLabelText, getByRole } = setup(site);

    expect(getByRole('radio', { name: '1 year' })).toHaveAttribute('aria-checked', 'true');

    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));
    expect(getByLabelText("Recipient's email")).toBeInTheDocument();
    expect(container.querySelector('.gh-portal-gift-email-lede')).toHaveTextContent(
      'Jamie has gifted you a 1-year Premium membership to The Blueprint',
    );
  });

  test('does not reuse buyer details left in page data by another flow', () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const { getByLabelText, getByRole, getByText } = setup(site, {
      member: null,
      pageData: {
        email: 'previous@example.com',
        name: 'Previous visitor',
      },
    });

    expect(getByLabelText('Your email')).toHaveValue('');
    expect(getByLabelText('Your name')).toHaveValue('');

    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));
    expect(getByText('Enter your email address')).toBeInTheDocument();

    fireEvent.change(getByLabelText('Your email'), { target: { value: 'b' } });
    expect(getByLabelText('Your email')).toHaveValue('b');
  });

  test('limits recipient details to the backend maximums', () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const { getByLabelText, getByRole } = setup(site);

    expect(getByLabelText('Your name')).toHaveAttribute('maxlength', '191');

    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));

    expect(getByLabelText("Recipient's email")).toHaveAttribute('maxlength', '191');
    expect(getByLabelText("Recipient's name")).toHaveAttribute('maxlength', '191');
  });

  test('requires a buyer name before continuing to delivery', () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const { getByLabelText, getByRole, getByText, mockDoActionFn, queryByLabelText } = setup(site);

    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));

    expect(queryByLabelText("Recipient's email")).not.toBeInTheDocument();
    expect(getByText('Enter your name')).toBeInTheDocument();

    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));
    fireEvent.change(getByLabelText("Recipient's email"), {
      target: { value: 'recipient@example.com' },
    });
    fireEvent.click(getByRole('button', { name: 'Continue to payment' }));

    expect(mockDoActionFn).toHaveBeenCalledWith(
      'checkoutGift',
      expect.objectContaining({
        deliveryMethod: 'email',
        buyerName: 'Jamie',
      }),
    );
  });

  test('requires a recipient email before continuing to payment', () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const { getByLabelText, getByRole, getByText, mockDoActionFn } = setup(site);

    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));
    fireEvent.click(getByRole('button', { name: 'Continue to payment' }));

    expect(mockDoActionFn).not.toHaveBeenCalled();
    expect(getByText("Enter the recipient's email address")).toBeInTheDocument();
    expect(getByRole('button', { name: 'Continue to payment' })).toBeDisabled();
  });

  test('clears the buyer name error as the buyer types', () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const { getByLabelText, getByRole, getByText, queryByText } = setup(site);

    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));

    expect(getByText('Enter your name')).toBeInTheDocument();
    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    expect(queryByText('Enter your name')).not.toBeInTheDocument();
    expect(getByRole('button', { name: 'Continue to delivery details' })).not.toBeDisabled();
  });

  test('shows a buyer name field for a whitespace-only member name', () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const { getByLabelText } = setup(site, {
      member: {
        email: 'buyer@example.com',
        name: '   ',
        status: 'free',
      },
    });

    expect(getByLabelText('Your name')).toBeInTheDocument();
  });

  test('going back clears delivery errors so the plan step is not locked', () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const { getByLabelText, getByRole, getByText, queryByText } = setup(site);

    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));
    fireEvent.click(getByRole('button', { name: 'Continue to payment' }));

    expect(getByText("Enter the recipient's email address")).toBeInTheDocument();

    fireEvent.click(getByRole('button', { name: /back/i }));

    expect(queryByText("Enter the recipient's email address")).not.toBeInTheDocument();
    expect(getByRole('button', { name: 'Continue to delivery details' })).not.toBeDisabled();

    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));
    expect(getByLabelText("Recipient's email")).toBeInTheDocument();
  });

  test('continues without a name field for a member with a saved name', () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const { getByLabelText, getByRole, mockDoActionFn, queryByLabelText } = setup(site, {
      member: {
        email: 'buyer@example.com',
        name: 'Jamie Larson',
        status: 'free',
      },
    });

    expect(queryByLabelText('Your name')).not.toBeInTheDocument();

    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));
    fireEvent.change(getByLabelText("Recipient's email"), {
      target: { value: 'recipient@example.com' },
    });
    fireEvent.click(getByRole('button', { name: 'Continue to payment' }));

    expect(mockDoActionFn).toHaveBeenCalledWith(
      'checkoutGift',
      expect.objectContaining({ buyerName: 'Jamie Larson' }),
    );
  });

  test('omits the selector when only one duration is available', () => {
    const site = buildSite({
      labs: {
        giftSubCustomization: true,
      },
      portalPlans: ['yearly'],
    });
    const { getByText, queryByRole } = setup(site);

    expect(queryByRole('radiogroup', { name: 'Gift duration' })).not.toBeInTheDocument();
    expect(getByText('1 year membership')).toBeInTheDocument();
  });

  test('falls back to the first available duration when the default plan is unavailable', () => {
    const site = buildSite({
      labs: {
        giftSubCustomization: true,
      },
      portalPlans: ['monthly'],
      portalDefaultPlan: 'yearly',
    });
    const { getByRole, queryByRole } = setup(site);

    expect(getByRole('radio', { name: '1 month' })).toHaveAttribute('aria-checked', 'true');
    expect(getByRole('radio', { name: '3 months' })).toBeInTheDocument();
    expect(getByRole('radio', { name: '6 months' })).toBeInTheDocument();
    expect(queryByRole('radio', { name: '1 year' })).not.toBeInTheDocument();
  });

  test('keeps email details locally but omits them from link delivery', () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const { getByLabelText, getByRole, mockDoActionFn } = setup(site);

    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));
    fireEvent.change(getByLabelText("Recipient's name"), { target: { value: 'Taylor' } });
    fireEvent.change(getByLabelText("Recipient's email"), {
      target: { value: 'recipient@example.com' },
    });
    fireEvent.change(getByLabelText('Optional message'), { target: { value: 'Enjoy!' } });

    fireEvent.click(getByRole('radio', { name: "I'll share it myself" }));
    fireEvent.click(getByRole('radio', { name: 'Email it to them' }));

    expect(getByLabelText("Recipient's name")).toHaveValue('Taylor');
    expect(getByLabelText("Recipient's email")).toHaveValue('recipient@example.com');
    expect(getByLabelText('Optional message')).toHaveValue('Enjoy!');

    fireEvent.click(getByRole('radio', { name: "I'll share it myself" }));
    fireEvent.click(getByRole('button', { name: 'Continue to payment' }));

    expect(mockDoActionFn).toHaveBeenCalledWith('checkoutGift', {
      tierId: 'tier_123',
      duration: 1,
      deliveryMethod: 'link',
      buyerName: 'Jamie',
    });
  });

  test('schedules email delivery from the always-visible delivery date field', () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const { container, getByLabelText, getByRole, mockDoActionFn } = setup(site);

    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));
    fireEvent.change(getByLabelText("Recipient's email"), {
      target: { value: 'recipient@example.com' },
    });
    const deliveryDate = container.querySelector<HTMLInputElement>('#gift-delivery-date');
    if (!deliveryDate) {
      throw new Error('Expected delivery date input');
    }
    const scheduledDate = deliveryDate.getAttribute('max');
    fireEvent.change(deliveryDate, { target: { value: scheduledDate } });
    fireEvent.click(getByRole('button', { name: 'Continue to payment' }));

    expect(mockDoActionFn).toHaveBeenCalledWith(
      'checkoutGift',
      expect.objectContaining({
        deliveryMethod: 'email',
        deliveryDate: scheduledDate,
      }),
    );
  });

  test('disables purchase until an out-of-range delivery date is corrected', () => {
    const site = buildSite({ labs: { giftSubCustomization: true } });
    const { container, getByLabelText, getByRole, getByText, mockDoActionFn } = setup(site);

    fireEvent.change(getByLabelText('Your name'), { target: { value: 'Jamie' } });
    fireEvent.click(getByRole('button', { name: 'Continue to delivery details' }));
    fireEvent.change(getByLabelText("Recipient's email"), {
      target: { value: 'recipient@example.com' },
    });
    const deliveryDate = container.querySelector<HTMLInputElement>('#gift-delivery-date');
    if (!deliveryDate) {
      throw new Error('Expected delivery date input');
    }
    // min/max don't stop typed values, so an out-of-range date is reachable
    fireEvent.change(deliveryDate, { target: { value: '2020-01-01' } });
    fireEvent.click(getByRole('button', { name: 'Continue to payment' }));

    expect(getByText('Choose a date from today onwards')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Continue to payment' })).toBeDisabled();
    expect(mockDoActionFn).not.toHaveBeenCalled();

    fireEvent.change(deliveryDate, { target: { value: '2999-01-01' } });
    fireEvent.click(getByRole('button', { name: 'Continue to payment' }));

    expect(getByText('Choose a date within the next year')).toBeInTheDocument();
    expect(getByRole('button', { name: 'Continue to payment' })).toBeDisabled();
    expect(mockDoActionFn).not.toHaveBeenCalled();

    fireEvent.change(deliveryDate, { target: { value: deliveryDate.getAttribute('max') } });

    expect(getByRole('button', { name: 'Continue to payment' })).not.toBeDisabled();
  });
});
