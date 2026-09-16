import ActionHandler from '../src/actions';
import { HumanReadableError } from '../src/utils/errors';
import { vi, type MockInstance } from 'vitest';
import { GIFT_FORM_STATE_KEY, createGiftFormState } from '../src/components/pages/gift/form-state';
import { ensureGiftPlanRoute, setGiftRoute } from '../src/components/pages/gift/navigation';

describe('closePopup action', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('clears a one-shot redirect from pageData so it cannot leak into a later sign-in', async () => {
    const result = await ActionHandler({
      action: 'closePopup',
      data: {},
      api: {},
      state: {
        page: 'signin',
        pageData: {
          redirect: 'https://example.com/post/#ghost-comments-1',
          email: 'reader@example.com',
        },
      },
    });

    // the redirect is dropped...
    expect(result.pageData.redirect).toBeUndefined();
    // ...but other pageData is preserved
    expect(result.pageData.email).toBe('reader@example.com');
    expect(result.showPopup).toBe(false);
  });

  test('handles missing pageData', async () => {
    const result = await ActionHandler({
      action: 'closePopup',
      data: {},
      api: {},
      state: { page: 'signin' },
    });
    expect(result.pageData).toEqual({});
  });

  test('clears a gift draft and returns past its gift history entries', async () => {
    window.history.replaceState(null, '', '/post#comments');
    window.sessionStorage.setItem(
      GIFT_FORM_STATE_KEY,
      JSON.stringify(createGiftFormState({ buyerName: 'Jamie' })),
    );
    ensureGiftPlanRoute();
    setGiftRoute({ step: 'delivery' });
    const historyGoSpy = vi.spyOn(window.history, 'go').mockImplementation(() => undefined);

    const result = await ActionHandler({
      action: 'closePopup',
      data: {},
      api: {},
      state: { page: 'gift' },
    });

    expect(historyGoSpy).toHaveBeenCalledWith(-2);
    expect(window.sessionStorage.getItem(GIFT_FORM_STATE_KEY)).toBeNull();
    expect(result.showPopup).toBe(false);
  });
});

describe('updateProfile action', () => {
  test('trims whitespace from name before saving', async () => {
    const mockApi = {
      member: {
        update: vi.fn(() => Promise.resolve({ name: 'John Doe', email: 'john@example.com' })),
      },
    };
    const state = {
      member: { name: 'Old Name', email: 'john@example.com' },
    };

    await ActionHandler({
      action: 'updateProfile',
      data: { name: '  John Doe  ', email: 'john@example.com' },
      state,
      api: mockApi,
    });

    expect(mockApi.member.update).toHaveBeenCalledWith({ name: 'John Doe' });
  });

  test('marks the custom field the site refused', async () => {
    const nickname = { key: 'nickname', name: 'Nickname', type: 'short_text' };
    const refusal = new HumanReadableError('Keep it under 255 characters.', {
      property: 'metafields.custom.nickname',
    });
    const mockApi = { member: { update: vi.fn(() => Promise.reject(refusal)) } };
    const state = {
      member: { name: 'Jamie', email: 'jamie@example.com' },
      customFields: [nickname],
    };

    const result = await ActionHandler({
      action: 'updateProfile',
      data: {
        name: 'Jamie',
        email: 'jamie@example.com',
        metafields: { custom: { nickname: 'x' } },
      },
      state,
      api: mockApi,
    });

    expect(result.action).toBe('updateProfile:failed');
    expect(result.fieldErrors).toEqual({ 'custom:nickname': 'Keep it under 255 characters.' });
  });

  // An address is drawn as several inputs under one name, so a refusal that named only
  // the field would leave a member looking at six boxes with no idea which one to fix.
  // The refusal is keyed by the input so the box itself carries it.
  test('marks the part of a composite the site refused', async () => {
    const address = { key: 'shipping_address', name: 'Shipping address', type: 'address' };
    const refusal = new HumanReadableError('Use 255 characters or fewer.', {
      property: 'metafields.custom.shipping_address.line1',
    });
    const mockApi = { member: { update: vi.fn(() => Promise.reject(refusal)) } };
    const state = {
      member: { name: 'Jamie', email: 'jamie@example.com' },
      customFields: [address],
    };

    const result = await ActionHandler({
      action: 'updateProfile',
      data: {
        name: 'Jamie',
        email: 'jamie@example.com',
        metafields: { custom: { shipping_address: { line1: 'x' } } },
      },
      state,
      api: mockApi,
    });

    expect(result.action).toBe('updateProfile:failed');
    expect(result.fieldErrors).toEqual({
      'custom:shipping_address:line1': 'Use 255 characters or fewer.',
    });
    // No notification at all: the boxes are marked, each carries its reason, and the
    // button offers to try again, so one over the top would only repeat the page.
    expect(result.popupNotification).toBeNull();
  });

  // A verification mail going out says nothing about whether the values saved. Reporting
  // success here lost what the member typed and left the page before they could see why.
  test('does not call a save successful when the email sent but the values were refused', async () => {
    const nickname = { key: 'nickname', name: 'Nickname', type: 'short_text' };
    const refusal = new HumanReadableError('Keep it under 255 characters.', {
      property: 'metafields.custom.nickname',
    });
    const mockApi = {
      member: {
        update: vi.fn(() => Promise.reject(refusal)),
        updateEmailAddress: vi.fn(() => Promise.resolve({ success: true })),
      },
    };
    const state = {
      member: { name: 'Jamie', email: 'jamie@example.com' },
      customFields: [nickname],
    };

    const result = await ActionHandler({
      action: 'updateProfile',
      data: {
        name: 'Jamie',
        email: 'new@example.com',
        metafields: { custom: { nickname: 'x' } },
      },
      state,
      api: mockApi,
    });

    expect(result.action).toBe('updateProfile:failed');
    expect(result.fieldErrors).toEqual({ 'custom:nickname': 'Keep it under 255 characters.' });
    // Still on the page, so the marked input is there to be seen and fixed.
    expect(result.page).toBeUndefined();
  });

  // The whole of a composite can be refused — archived, or closed to members, while the
  // page was open — and no one box is named for the field, so the notification keeps it.
  test('names the field when the whole of a composite is refused', async () => {
    const address = { key: 'shipping_address', name: 'Shipping address', type: 'address' };
    const refusal = new HumanReadableError('Cannot set custom field: custom.shipping_address', {
      property: 'metafields.custom.shipping_address',
    });
    const mockApi = { member: { update: vi.fn(() => Promise.reject(refusal)) } };
    const state = {
      member: { name: 'Jamie', email: 'jamie@example.com' },
      customFields: [address],
    };

    const result = await ActionHandler({
      action: 'updateProfile',
      data: {
        name: 'Jamie',
        email: 'jamie@example.com',
        metafields: { custom: { shipping_address: { line1: 'x' } } },
      },
      state,
      api: mockApi,
    });

    expect(result.fieldErrors).toEqual({});
    expect(result.popupNotification.message).toBe(
      'Shipping address: Cannot set custom field: custom.shipping_address',
    );
  });

  // A refusal naming a part the field does not have would mark a box that is not on the
  // page, and the notification is held back whenever a box is marked - so the save would
  // have failed without saying anything at all.
  test('says so when a refusal names a part that is not drawn', async () => {
    const address = { key: 'shipping_address', name: 'Shipping address', type: 'address' };
    const refusal = new HumanReadableError('Unrecognized key: "line3"', {
      property: 'metafields.custom.shipping_address.line3',
    });
    const mockApi = { member: { update: vi.fn(() => Promise.reject(refusal)) } };
    const state = {
      member: { name: 'Jamie', email: 'jamie@example.com' },
      customFields: [address],
    };

    const result = await ActionHandler({
      action: 'updateProfile',
      data: {
        name: 'Jamie',
        email: 'jamie@example.com',
        metafields: { custom: { shipping_address: { line1: 'x' } } },
      },
      state,
      api: mockApi,
    });

    expect(result.fieldErrors).toEqual({});
    expect(result.popupNotification.message).toBe('Shipping address: Unrecognized key: "line3"');
  });

  // The site refuses every value it objects to in one answer, so a member fixes an
  // address in one pass rather than learning about the next line each time they save.
  test('marks every part the site refused, not only the first', async () => {
    const address = { key: 'shipping_address', name: 'Shipping address', type: 'address' };
    const refusal = new HumanReadableError('Use 255 characters or fewer.', {
      property: 'metafields.custom.shipping_address.line1',
      details: [
        {
          property: 'metafields.custom.shipping_address.line1',
          message: 'Use 255 characters or fewer.',
        },
        {
          property: 'metafields.custom.shipping_address.line2',
          message: 'Use 255 characters or fewer.',
        },
        {
          property: 'metafields.custom.shipping_address.country',
          message: 'Enter a 2-letter country code, like US.',
        },
      ],
    });
    const mockApi = { member: { update: vi.fn(() => Promise.reject(refusal)) } };
    const state = {
      member: { name: 'Jamie', email: 'jamie@example.com' },
      customFields: [address],
    };

    const result = await ActionHandler({
      action: 'updateProfile',
      data: {
        name: 'Jamie',
        email: 'jamie@example.com',
        metafields: { custom: { shipping_address: { line1: 'x' } } },
      },
      state,
      api: mockApi,
    });

    expect(result.fieldErrors).toEqual({
      'custom:shipping_address:line1': 'Use 255 characters or fewer.',
      'custom:shipping_address:line2': 'Use 255 characters or fewer.',
      'custom:shipping_address:country': 'Enter a 2-letter country code, like US.',
    });
    // Every one of them is on a box, so nothing is left for a notification to add.
    expect(result.popupNotification).toBeNull();
  });

  // A site answering in a shape this build does not know is read as one refusal, not as
  // a reason to take the page down: what reads these asks them for a translation, and
  // that does not survive being handed something which is not text.
  test('reads a refusal list it cannot make sense of as a single refusal', async () => {
    const nickname = { key: 'nickname', name: 'Nickname', type: 'short_text' };
    const refusal = new HumanReadableError('Keep it under 255 characters.', {
      property: 'metafields.custom.nickname',
      details: [{ property: 42, message: { nope: true } }, 'not even an object', null] as never,
    });
    const mockApi = { member: { update: vi.fn(() => Promise.reject(refusal)) } };
    const state = {
      member: { name: 'Jamie', email: 'jamie@example.com' },
      customFields: [nickname],
    };

    const result = await ActionHandler({
      action: 'updateProfile',
      data: {
        name: 'Jamie',
        email: 'jamie@example.com',
        metafields: { custom: { nickname: 'x' } },
      },
      state,
      api: mockApi,
    });

    expect(result.action).toBe('updateProfile:failed');
    expect(result.fieldErrors).toEqual({ 'custom:nickname': 'Keep it under 255 characters.' });
  });

  // Leaving the page discards what was typed, so a refusal of it must not come back to
  // mark a value the member never sees again.
  test('forgets a refusal when the member leaves the page', async () => {
    const result = await ActionHandler({
      action: 'switchPage',
      data: { page: 'accountHome' },
      state: { fieldErrors: { 'custom:nickname': 'Keep it under 255 characters.' } },
      api: {},
    });

    expect(result.fieldErrors).toEqual({});
  });

  // The suppression is about not repeating the page, not about going quiet: a failure no
  // input can show has nowhere else to be said.
  test('still says something when nothing on the page can', async () => {
    const mockApi = { member: { update: vi.fn(() => Promise.reject(new Error('offline'))) } };
    const state = { member: { name: 'Jamie', email: 'jamie@example.com' }, customFields: [] };

    const result = await ActionHandler({
      action: 'updateProfile',
      data: { name: 'Renamed', email: 'jamie@example.com' },
      state,
      api: mockApi,
    });

    expect(result.fieldErrors).toEqual({});
    expect(result.popupNotification.message).toBe('Failed to update account details');
  });

  test('keeps the usual message when a failure names no field', async () => {
    const mockApi = { member: { update: vi.fn(() => Promise.reject(new Error('offline'))) } };
    const state = { member: { name: 'Jamie', email: 'jamie@example.com' }, customFields: [] };

    const result = await ActionHandler({
      action: 'updateProfile',
      data: { name: 'Renamed', email: 'jamie@example.com' },
      state,
      api: mockApi,
    });

    expect(result.popupNotification.message).toBe('Failed to update account details');
  });
});

describe('signup action', () => {
  test('trims whitespace from name', async () => {
    const mockApi = {
      member: {
        getIntegrityToken: vi.fn(() => Promise.resolve('token-123')),
        sendMagicLink: vi.fn(() => Promise.resolve()),
      },
    };
    const state = { site: {} };

    await ActionHandler({
      action: 'signup',
      data: { plan: 'free', email: 'john@example.com', name: '  John Doe  ' },
      state,
      api: mockApi,
    });

    expect(mockApi.member.sendMagicLink).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'John Doe' }),
    );
  });

  test('continues to signin magic link page when checkout finds an existing subscription', async () => {
    const checkoutError = new Error('A subscription exists for this Member.') as Error & {
      code: string;
    };
    checkoutError.code = 'CANNOT_CHECKOUT_WITH_EXISTING_SUBSCRIPTION';

    const mockApi = {
      member: {
        checkoutPlan: vi.fn(() => Promise.reject(checkoutError)),
      },
    };
    const state = {
      site: {},
      pageData: {
        offerId: 'offer_123',
      },
    };

    const result = await ActionHandler({
      action: 'signup',
      data: {
        plan: 'price_123',
        tierId: 'tier_123',
        cadence: 'month',
        email: 'jamie@example.com',
        name: 'Jamie',
      },
      state,
      api: mockApi,
    });

    expect(mockApi.member.checkoutPlan).toHaveBeenCalled();
    expect(result).toMatchObject({
      page: 'magiclink',
      lastPage: 'signin',
      pageData: {
        offerId: 'offer_123',
        email: 'jamie@example.com',
      },
      popupNotification: null,
    });
    expect(result).not.toHaveProperty('action', 'signup:failed');
  });

  test('shows an error when a logged-in member checkout finds an existing subscription', async () => {
    const checkoutError = new Error('A subscription exists for this Member.') as Error & {
      code: string;
    };
    checkoutError.code = 'CANNOT_CHECKOUT_WITH_EXISTING_SUBSCRIPTION';

    const mockApi = {
      member: {
        checkoutPlan: vi.fn(() => Promise.reject(checkoutError)),
      },
    };
    const state = {
      site: {},
      member: {
        name: 'Jamie Larson',
        email: 'jamie@example.com',
        paid: true,
      },
    };

    const result = await ActionHandler({
      action: 'signup',
      data: {
        plan: 'price_123',
        tierId: 'tier_123',
        cadence: 'month',
      },
      state,
      api: mockApi,
    });

    // No sign-in email is sent for authenticated members, so the
    // check-your-email page would be misleading.
    expect(result).not.toHaveProperty('page', 'magiclink');
    expect(result).toMatchObject({
      action: 'signup:failed',
      popupNotification: {
        type: 'signup:failed',
        status: 'error',
        message: 'You already have an active subscription.',
      },
    });
  });
});

describe('redeemGift action', () => {
  test('redeems a gift directly for a logged-in member and refreshes member data', async () => {
    window.history.replaceState({}, '', '/#/portal/gift/redeem/gift-token-123');

    const mockApi = {
      gift: {
        redeem: vi.fn(() =>
          Promise.resolve({
            gifts: [
              {
                token: 'gift-token-123',
                status: 'redeemed',
              },
            ],
          }),
        ),
      },
      member: {
        sessionData: vi.fn(() =>
          Promise.resolve({
            name: 'Jamie Larson',
            email: 'jamie@example.com',
            paid: true,
            status: 'gift',
            subscriptions: [
              {
                status: 'active',
                tier: {
                  name: 'Premium',
                  expiry_at: '2027-05-29T12:00:00.000Z',
                },
              },
            ],
          }),
        ),
        getIntegrityToken: vi.fn(),
        sendMagicLink: vi.fn(),
      },
    };
    const state = {
      member: {
        name: 'Jamie Larson',
        email: 'jamie@example.com',
        status: 'free',
      },
      pageData: {
        token: 'gift-token-123',
        gift: {
          cadence: 'year',
          duration: 1,
          tier: {
            name: 'Premium',
          },
        },
      },
    };

    const result = await ActionHandler({
      action: 'redeemGift',
      data: {
        giftToken: 'gift-token-123',
      },
      state,
      api: mockApi,
    });

    expect(mockApi.gift.redeem).toHaveBeenCalledWith({ token: 'gift-token-123' });
    expect(mockApi.member.sessionData).toHaveBeenCalled();
    expect(mockApi.member.getIntegrityToken).not.toHaveBeenCalled();
    expect(mockApi.member.sendMagicLink).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      action: 'redeemGift:success',
      showPopup: false,
      lastPage: null,
      pageQuery: '',
      popupNotification: null,
      member: {
        status: 'gift',
      },
      notification: {
        type: 'giftRedeem',
        status: 'success',
        message: 'You now have access to Premium until 29 May 2027. Enjoy!',
      },
    });
    // Ensure the account page is no longer rendered after redemption.
    expect(result).not.toHaveProperty('page');
    // Redemption hash is cleared so a refresh doesn't re-trigger the redeemed-token flow.
    expect(window.location.hash).toBe('');
  });

  test('sends a subscribe magic link with the gift token and redirects back to Portal account', async () => {
    const mockApi = {
      member: {
        getIntegrityToken: vi.fn(() => Promise.resolve('token-123')),
        sendMagicLink: vi.fn(() => Promise.resolve({ otc_ref: 'otc-ref-123' })),
      },
    };
    const state = {
      site: {
        url: 'https://example.com/',
      },
      pageData: {
        token: 'gift-token-123',
        gift: {
          cadence: 'month',
          duration: 3,
          tier: {
            name: 'Ultra',
          },
        },
      },
    };

    const result = await ActionHandler({
      action: 'redeemGift',
      data: {
        email: 'jamie@example.com',
        name: '  Jamie Larson  ',
        giftToken: 'gift-token-123',
      },
      state,
      api: mockApi,
    });

    const expectedRedirect = 'https://example.com/?giftRedemption=true';

    expect(mockApi.member.sendMagicLink).toHaveBeenCalledWith({
      email: 'jamie@example.com',
      emailType: 'subscribe',
      integrityToken: 'token-123',
      includeOTC: true,
      redirect: expectedRedirect,
      giftToken: 'gift-token-123',
      name: 'Jamie Larson',
    });

    expect(result).toMatchObject({
      page: 'magiclink',
      lastPage: 'gift',
      otcRef: 'otc-ref-123',
      pageData: {
        token: 'gift-token-123',
        email: 'jamie@example.com',
        name: 'Jamie Larson',
        redirect: expectedRedirect,
      },
    });
  });
});

describe('startSigninOTCFromCustomForm action', () => {
  test('opens magic link popup with otcRef', async () => {
    const state = {
      pageData: { existing: 'data' },
    };
    const result = await ActionHandler({
      action: 'startSigninOTCFromCustomForm',
      data: {
        email: ' test@example.com ',
        otcRef: 'ref-123',
      },
      state,
      api: {},
    });

    expect(result).toMatchObject({
      showPopup: true,
      page: 'magiclink',
      lastPage: 'signin',
      otcRef: 'ref-123',
      pageData: {
        existing: 'data',
        email: 'test@example.com',
      },
      popupNotification: null,
    });
  });

  test('returns empty object when otcRef missing', async () => {
    const result = await ActionHandler({
      action: 'startSigninOTCFromCustomForm',
      data: {
        email: 'test@example.com',
      },
      state: {},
      api: {},
    });

    expect(result).toEqual({});
  });
});

describe('notification actions', () => {
  test('increments notification count after a notification is dismissed', async () => {
    const firstNotification = await ActionHandler({
      action: 'openNotification',
      data: {
        action: 'giftRedemption:failed',
        status: 'error',
        autoHide: false,
        message: 'Gift could not be redeemed',
      },
      state: {
        notification: null,
        notificationSequence: -1,
      },
      api: {},
    });

    expect(firstNotification.notification.count).toBe(0);
    expect(firstNotification.notificationSequence).toBe(0);

    const dismissedNotification = await ActionHandler({
      action: 'closeNotification',
      data: {},
      state: {
        ...firstNotification,
      },
      api: {},
    });

    expect(dismissedNotification).toEqual({
      notification: null,
    });

    const secondNotification = await ActionHandler({
      action: 'openNotification',
      data: {
        action: 'giftRedemption:failed',
        status: 'error',
        autoHide: false,
        message: 'Gift could not be redeemed',
      },
      state: {
        ...firstNotification,
        ...dismissedNotification,
      },
      api: {},
    });

    expect(secondNotification.notification.count).toBe(1);
    expect(secondNotification.notificationSequence).toBe(1);
  });
});

describe('continueSubscription action', () => {
  test('returns reloadOnPopupClose on success', async () => {
    const mockApi = {
      member: {
        updateSubscription: vi.fn(() => Promise.resolve()),
        sessionData: vi.fn(() => Promise.resolve({ name: 'Test', email: 'test@example.com' })),
      },
    };

    const result = await ActionHandler({
      action: 'continueSubscription',
      data: { subscriptionId: 'sub_123' },
      state: {},
      api: mockApi,
    });

    expect(result.reloadOnPopupClose).toBe(true);
    expect(result.action).toBe('continueSubscription:success');
  });

  test('does not return reloadOnPopupClose on failure', async () => {
    const mockApi = {
      member: {
        updateSubscription: vi.fn(() => Promise.reject(new Error('API error'))),
      },
    };

    const result = await ActionHandler({
      action: 'continueSubscription',
      data: { subscriptionId: 'sub_123' },
      state: {},
      api: mockApi,
    });

    expect(result.reloadOnPopupClose).toBeUndefined();
    expect(result.action).toBe('continueSubscription:failed');
  });
});

describe('cancelSubscription action', () => {
  test('returns reloadOnPopupClose on success', async () => {
    const mockApi = {
      member: {
        updateSubscription: vi.fn(() => Promise.resolve()),
        sessionData: vi.fn(() => Promise.resolve({ name: 'Test', email: 'test@example.com' })),
      },
    };

    const result = await ActionHandler({
      action: 'cancelSubscription',
      data: { subscriptionId: 'sub_123', cancellationReason: 'Too expensive' },
      state: {},
      api: mockApi,
    });

    expect(result.reloadOnPopupClose).toBe(true);
    expect(result.action).toBe('cancelSubscription:success');
  });

  test('does not return reloadOnPopupClose on failure', async () => {
    const mockApi = {
      member: {
        updateSubscription: vi.fn(() => Promise.reject(new Error('API error'))),
      },
    };

    const result = await ActionHandler({
      action: 'cancelSubscription',
      data: { subscriptionId: 'sub_123' },
      state: {},
      api: mockApi,
    });

    expect(result.reloadOnPopupClose).toBeUndefined();
    expect(result.action).toBe('cancelSubscription:failed');
  });
});

describe('applyOffer action', () => {
  test('returns reloadOnPopupClose on success', async () => {
    const mockApi = {
      member: {
        applyOffer: vi.fn(() => Promise.resolve()),
        sessionData: vi.fn(() => Promise.resolve({ name: 'Test', email: 'test@example.com' })),
      },
    };

    const result = await ActionHandler({
      action: 'applyOffer',
      data: { offerId: 'offer_123', subscriptionId: 'sub_123' },
      state: {},
      api: mockApi,
    });

    expect(result.reloadOnPopupClose).toBe(true);
    expect(result.action).toBe('applyOffer:success');
  });

  test('does not return reloadOnPopupClose on failure', async () => {
    const mockApi = {
      member: {
        applyOffer: vi.fn(() => Promise.reject(new Error('API error'))),
      },
    };

    const result = await ActionHandler({
      action: 'applyOffer',
      data: { offerId: 'offer_123', subscriptionId: 'sub_123' },
      state: {},
      api: mockApi,
    });

    expect(result.reloadOnPopupClose).toBeUndefined();
    expect(result.action).toBe('applyOffer:failed');
  });
});

describe('verifyOTC action', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let originalLocation: any;
  let mockLocationAssign: MockInstance;

  beforeEach(() => {
    mockLocationAssign = vi.fn();
    originalLocation = window.location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.location = { assign: mockLocationAssign } as any;
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  test('redirects on successful verification', async () => {
    const mockApi = {
      member: {
        getIntegrityToken: vi.fn(() => Promise.resolve('token-123')),
        verifyOTC: vi.fn(() =>
          Promise.resolve({
            redirectUrl: 'https://example.com/success',
          }),
        ),
      },
    };

    await ActionHandler({
      action: 'verifyOTC',
      data: { otc: '123456', otcRef: 'ref-123' },
      state: {},
      api: mockApi,
    });

    expect(mockLocationAssign).toHaveBeenCalledWith('https://example.com/success');
    expect(mockApi.member.verifyOTC).toHaveBeenCalledWith({
      otc: '123456',
      otcRef: 'ref-123',
      integrityToken: 'token-123',
    });
  });

  test('returns actionErrorMessage when verification fails without redirectUrl', async () => {
    // Simulate API returning parsed JSON without redirectUrl (error case)
    const mockResponse = {
      errors: [
        {
          message: 'Invalid verification code',
        },
      ],
    };

    const mockApi = {
      member: {
        getIntegrityToken: vi.fn(() => Promise.resolve('token-123')),
        verifyOTC: vi.fn(() => Promise.resolve(mockResponse)),
      },
    };

    const result = await ActionHandler({
      action: 'verifyOTC',
      data: { otc: '000000', otcRef: 'ref-123' },
      state: {},
      api: mockApi,
    });

    expect(result.action).toBe('verifyOTC:failed');
    expect(result.actionErrorMessage).toBe('Invalid verification code');
    expect(result.popupNotification).toBeUndefined();
  });

  test('returns actionErrorMessage on API exception', async () => {
    const mockApi = {
      member: {
        getIntegrityToken: vi.fn(() => Promise.resolve('token-123')),
        verifyOTC: vi.fn(() => Promise.reject(new Error('Network error'))),
      },
    };

    const result = await ActionHandler({
      action: 'verifyOTC',
      data: { otc: '123456', otcRef: 'ref-123' },
      state: {},
      api: mockApi,
    });

    expect(result.action).toBe('verifyOTC:failed');
    expect(result.actionErrorMessage).toBe('Failed to verify code, please try again');
    expect(result.popupNotification).toBeUndefined();
  });

  test('passes redirect parameter to verifyOTC API call, includes integrity token', async () => {
    const mockApi = {
      member: {
        getIntegrityToken: vi.fn(() => Promise.resolve('integrity-123')),
        verifyOTC: vi.fn(() =>
          Promise.resolve({
            redirectUrl: 'https://example.com/custom',
          }),
        ),
      },
    };

    await ActionHandler({
      action: 'verifyOTC',
      data: {
        otc: '123456',
        otcRef: 'ref-123',
        redirect: 'https://custom-redirect.com',
      },
      state: {},
      api: mockApi,
    });

    expect(mockApi.member.verifyOTC).toHaveBeenCalledWith({
      otc: '123456',
      otcRef: 'ref-123',
      redirect: 'https://custom-redirect.com',
      integrityToken: 'integrity-123',
    });
  });

  describe('edge cases', () => {
    test('handles response without redirectUrl or message', async () => {
      const mockApi = {
        member: {
          getIntegrityToken: vi.fn(() => Promise.resolve('token-123')),
          verifyOTC: vi.fn(() => Promise.resolve({})), // empty response
        },
      };

      const result = await ActionHandler({
        action: 'verifyOTC',
        data: { otc: '123456', otcRef: 'ref-123' },
        state: {},
        api: mockApi,
      });

      expect(result.action).toBe('verifyOTC:failed');
      expect(result.actionErrorMessage).toBeDefined();
    });
  });
});

describe('checkoutGift action', () => {
  test('calls api.member.checkoutGift with correct data', async () => {
    const mockApi = {
      member: {
        checkoutGift: vi.fn(() => Promise.resolve()),
      },
    };

    const result = await ActionHandler({
      action: 'checkoutGift',
      data: { tierId: 'tier_123', cadence: 'month' },
      state: {},
      api: mockApi,
    });

    expect(mockApi.member.checkoutGift).toHaveBeenCalledWith({
      tierId: 'tier_123',
      cadence: 'month',
    });
    expect(result.action).toBe('checkoutGift:success');
  });

  test('passes customer email through to api.member.checkoutGift', async () => {
    const mockApi = {
      member: {
        checkoutGift: vi.fn(() => Promise.resolve()),
      },
    };

    const result = await ActionHandler({
      action: 'checkoutGift',
      data: { tierId: 'tier_123', cadence: 'month', email: 'jamie@example.com' },
      state: {},
      api: mockApi,
    });

    expect(mockApi.member.checkoutGift).toHaveBeenCalledWith({
      tierId: 'tier_123',
      cadence: 'month',
      email: 'jamie@example.com',
    });
    expect(result.action).toBe('checkoutGift:success');
  });

  test('passes a fixed duration through to api.member.checkoutGift', async () => {
    const mockApi = {
      member: {
        checkoutGift: vi.fn(() => Promise.resolve()),
      },
    };

    const result = await ActionHandler({
      action: 'checkoutGift',
      data: { tierId: 'tier_123', duration: 3 },
      state: {},
      api: mockApi,
    });

    expect(mockApi.member.checkoutGift).toHaveBeenCalledWith({
      tierId: 'tier_123',
      duration: 3,
    });
    expect(result.action).toBe('checkoutGift:success');
  });

  test('passes immediate email delivery details through to api.member.checkoutGift', async () => {
    const mockApi = {
      member: {
        checkoutGift: vi.fn(() => Promise.resolve()),
      },
    };

    await ActionHandler({
      action: 'checkoutGift',
      data: {
        tierId: 'tier_123',
        duration: 3,
        deliveryMethod: 'email',
        recipientEmail: 'recipient@example.com',
        recipientName: 'Taylor',
        buyerName: 'Jamie',
        personalMessage: 'Enjoy!',
      },
      state: {},
      api: mockApi,
    });

    expect(mockApi.member.checkoutGift).toHaveBeenCalledWith({
      tierId: 'tier_123',
      duration: 3,
      deliveryMethod: 'email',
      recipientEmail: 'recipient@example.com',
      recipientName: 'Taylor',
      buyerName: 'Jamie',
      personalMessage: 'Enjoy!',
    });
  });

  test('passes a scheduled delivery date through to api.member.checkoutGift', async () => {
    const mockApi = {
      member: {
        checkoutGift: vi.fn(() => Promise.resolve()),
      },
    };

    await ActionHandler({
      action: 'checkoutGift',
      data: {
        tierId: 'tier_123',
        duration: 3,
        deliveryMethod: 'email',
        recipientEmail: 'recipient@example.com',
        deliveryDate: '2026-12-25',
      },
      state: {},
      api: mockApi,
    });

    expect(mockApi.member.checkoutGift).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryDate: '2026-12-25',
      }),
    );
  });

  test('returns failed action with notification on error', async () => {
    const mockApi = {
      member: {
        checkoutGift: vi.fn(() => Promise.reject(new Error('Stripe error'))),
      },
    };

    const result = await ActionHandler({
      action: 'checkoutGift',
      data: { tierId: 'tier_123', cadence: 'month' },
      state: {},
      api: mockApi,
    });

    expect(result.action).toBe('checkoutGift:failed');
    expect(result.popupNotification).toBeDefined();
    expect(result.popupNotification.type).toBe('checkoutGift:failed');
    expect(result.popupNotification.status).toBe('error');
  });
});
