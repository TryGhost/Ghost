import setupGhostApi from './utils/api';
import { chooseBestErrorMessage } from './utils/errors';
import {
  getGiftRedemptionErrorMessage,
  getGiftRedemptionSuccessMessage,
} from './utils/gift-redemption-notification';
import {
  createNotification,
  createPopupNotification,
  getMemberEmail,
  getMemberName,
  getProductCadenceFromPrice,
  removePortalLinkFromUrl,
  getRefDomain,
} from './utils/helpers';
import { subFieldsOf } from '@tryghost/metafield-types/structure';
import { t } from './utils/i18n';
import { clearGiftFormState } from './components/pages/gift/form-state';
import { restoreGiftEntryRoute } from './components/pages/gift/navigation';

const CANNOT_CHECKOUT_WITH_EXISTING_SUBSCRIPTION = 'CANNOT_CHECKOUT_WITH_EXISTING_SUBSCRIPTION';

function switchPage({ data, state }) {
  return {
    page: data.page,
    popupNotification: null,
    // Cleared with the notification, and for the same reason: leaving the page discards
    // what was typed, so a refusal of it would otherwise come back to mark a value the
    // member never sees again.
    fieldErrors: {},
    lastPage: data.lastPage || null,
    pageData: data.pageData || state.pageData,
  };
}

function togglePopup({ state }) {
  return {
    showPopup: !state.showPopup,
  };
}

function openPopup({ data }) {
  return {
    showPopup: true,
    reloadOnPopupClose: false,
    page: data.page,
    ...(data.pageQuery ? { pageQuery: data.pageQuery } : {}),
    ...(data.pageData ? { pageData: data.pageData } : {}),
  };
}

function back({ state }) {
  if (state.page === 'gift') {
    clearGiftFormState();
  }

  if (state.lastPage) {
    return {
      page: state.lastPage,
      fieldErrors: {},
    };
  } else {
    return closePopup({ state });
  }
}

function closePopup({ state }) {
  let restoredGiftEntryRoute = false;
  if (state.page === 'gift') {
    clearGiftFormState();
    restoredGiftEntryRoute = restoreGiftEntryRoute();
  }

  if (!restoredGiftEntryRoute) {
    removePortalLinkFromUrl();
  }
  // Drop any one-shot post-sign-in redirect (e.g. set when sign-in is opened
  // from a comment "Reply") so a dismissed sign-in can't leak its redirect into
  // a later, unrelated sign-in on the same page. Other pageData is preserved.
  const pageData = { ...(state.pageData || {}) };
  delete pageData.redirect;
  return {
    showPopup: false,
    lastPage: null,
    pageQuery: '',
    popupNotification: null,
    fieldErrors: {},
    page: state.page === 'magiclink' ? '' : state.page,
    pageData,
  };
}

function openNotification({ data, state }) {
  const {
    action = 'openNotification',
    status = 'success',
    autoHide = true,
    closeable = true,
    duration = 2600,
    message = '',
  } = data || {};

  const notification = createNotification({
    type: action,
    status,
    autoHide,
    closeable,
    duration,
    state,
    message,
  });

  return {
    notification,
    notificationSequence: notification.count,
  };
}

function closeNotification() {
  return {
    notification: null,
  };
}

async function signout({ api, state }) {
  try {
    await api.member.signout();
    return {
      action: 'signout:success',
    };
  } catch (e) {
    return {
      action: 'signout:failed',
      popupNotification: createPopupNotification({
        type: 'signout:failed',
        autoHide: false,
        closeable: true,
        state,
        status: 'error',
        message: t('Failed to log out, please try again'),
      }),
    };
  }
}

async function signin({ data, api, state }) {
  try {
    const integrityToken = await api.member.getIntegrityToken();
    const payload = {
      ...data,
      emailType: 'signin',
      integrityToken,
      includeOTC: true,
    };
    const { otc_ref: otcRef, inboxLinks } = await api.member.sendMagicLink(payload);
    return {
      page: 'magiclink',
      lastPage: 'signin',
      ...(otcRef ? { otcRef } : {}),
      inboxLinks,
      pageData: {
        ...(state.pageData || {}),
        email: (data?.email || '').trim(),
      },
    };
  } catch (e) {
    return {
      action: 'signin:failed',
      popupNotification: createPopupNotification({
        type: 'signin:failed',
        autoHide: false,
        closeable: true,
        state,
        status: 'error',
        message: chooseBestErrorMessage(e, t('Failed to log in, please try again')),
      }),
    };
  }
}

function startSigninOTCFromCustomForm({ data, state }) {
  const email = (data?.email || '').trim();
  const otcRef = data?.otcRef;
  const inboxLinks = data?.inboxLinks;

  if (!otcRef) {
    return {};
  }

  return {
    showPopup: true,
    page: 'magiclink',
    lastPage: 'signin',
    otcRef,
    inboxLinks,
    pageData: {
      ...(state.pageData || {}),
      email,
    },
    popupNotification: null,
  };
}

async function verifyOTC({ data, api }) {
  const genericErrorMessage = t('Failed to verify code, please try again');

  try {
    const integrityToken = await api.member.getIntegrityToken();
    const response = await api.member.verifyOTC({ ...data, integrityToken });

    if (response.redirectUrl) {
      return window.location.assign(response.redirectUrl);
    } else {
      return {
        action: 'verifyOTC:failed',
        actionErrorMessage: chooseBestErrorMessage(response.errors?.[0], genericErrorMessage),
      };
    }
  } catch (e) {
    return {
      action: 'verifyOTC:failed',
      actionErrorMessage: chooseBestErrorMessage(e, genericErrorMessage),
    };
  }
}

async function signup({ data, state, api }) {
  try {
    let { plan, tierId, cadence, email, name, newsletters, offerId } = data;
    name = name?.trim();

    let inboxLinks;
    if (plan.toLowerCase() === 'free') {
      const integrityToken = await api.member.getIntegrityToken();
      ({ inboxLinks } = await api.member.sendMagicLink({
        emailType: 'signup',
        integrityToken,
        ...data,
        name,
      }));
    } else {
      // An existing (logged-in) member starting a paid checkout is upgrading, not signing up,
      // so flag it as an upgrade to suppress the signup email.
      const metadata = state.member ? { checkoutType: 'upgrade' } : undefined;
      if (!tierId || !cadence) {
        ({ tierId, cadence } = getProductCadenceFromPrice({ site: state?.site, priceId: plan }));
      }
      await api.member.checkoutPlan({
        plan,
        tierId,
        cadence,
        email,
        name,
        newsletters,
        offerId,
        metadata,
      });
      return {
        page: 'loading',
      };
    }
    return {
      page: 'magiclink',
      lastPage: 'signup',
      inboxLinks,
      pageData: {
        ...(state.pageData || {}),
        email: (email || '').trim(),
      },
    };
  } catch (e) {
    if (e.code === CANNOT_CHECKOUT_WITH_EXISTING_SUBSCRIPTION) {
      if (state.member) {
        return {
          action: 'signup:failed',
          popupNotification: createPopupNotification({
            type: 'signup:failed',
            autoHide: false,
            closeable: true,
            state,
            status: 'error',
            message: t('You already have an active subscription.'),
          }),
        };
      }

      return {
        page: 'magiclink',
        lastPage: 'signin',
        pageData: {
          ...(state.pageData || {}),
          email: (data?.email || '').trim(),
        },
        popupNotification: null,
      };
    }

    const message = chooseBestErrorMessage(e, t('Failed to sign up, please try again'));
    return {
      action: 'signup:failed',
      popupNotification: createPopupNotification({
        type: 'signup:failed',
        autoHide: false,
        closeable: true,
        state,
        status: 'error',
        message: message,
      }),
    };
  }
}

async function redeemGift({ data, state, api }) {
  try {
    let { email, name, giftToken } = data;
    name = name?.trim();

    if (state.member) {
      await api.gift.redeem({ token: giftToken });
      const member = await api.member.sessionData();
      const notification = createNotification({
        type: 'giftRedeem',
        status: 'success',
        autoHide: true,
        closeable: true,
        state,
        message: getGiftRedemptionSuccessMessage({ member }),
      });
      removePortalLinkFromUrl();

      return {
        action: 'redeemGift:success',
        member,
        showPopup: false,
        lastPage: null,
        pageQuery: '',
        popupNotification: null,
        notification,
        notificationSequence: notification.count,
      };
    }

    const integrityToken = await api.member.getIntegrityToken();
    const redirectUrl = new URL(state?.site?.url || window.location.href);
    redirectUrl.search = new URLSearchParams({
      giftRedemption: 'true',
    }).toString();
    redirectUrl.hash = '';

    const { otc_ref: otcRef, inboxLinks } = await api.member.sendMagicLink({
      email: (email || '').trim(),
      emailType: 'subscribe',
      integrityToken,
      includeOTC: true,
      redirect: redirectUrl.href,
      giftToken,
      ...(name ? { name } : {}),
    });

    return {
      page: 'magiclink',
      lastPage: 'gift',
      ...(otcRef ? { otcRef } : {}),
      inboxLinks,
      pageData: {
        ...(state.pageData || {}),
        email: (email || '').trim(),
        ...(name ? { name } : {}),
        redirect: redirectUrl.href,
      },
    };
  } catch (e) {
    const notification = createNotification({
      type: 'giftRedeem',
      status: 'error',
      autoHide: false,
      closeable: true,
      state,
      message: getGiftRedemptionErrorMessage(e),
    });
    removePortalLinkFromUrl();

    return {
      action: 'redeemGift:failed',
      showPopup: false,
      lastPage: null,
      pageQuery: '',
      popupNotification: null,
      notification,
      notificationSequence: notification.count,
    };
  }
}

async function checkoutPlan({ data, state, api }) {
  try {
    let { plan, offerId, tierId, cadence } = data;
    if (!tierId || !cadence) {
      ({ tierId, cadence } = getProductCadenceFromPrice({ site: state?.site, priceId: plan }));
    }
    await api.member.checkoutPlan({
      plan,
      tierId,
      cadence,
      offerId,
      metadata: {
        checkoutType: 'upgrade',
      },
    });
  } catch (e) {
    return {
      action: 'checkoutPlan:failed',
      popupNotification: createPopupNotification({
        type: 'checkoutPlan:failed',
        autoHide: false,
        closeable: true,
        state,
        status: 'error',
        message: t('Failed to process checkout, please try again'),
      }),
    };
  }
}

async function continueGiftSubscription({ state, api }) {
  try {
    await api.member.continueGiftCheckout();
  } catch (e) {
    return {
      action: 'continueGiftSubscription:failed',
      popupNotification: createPopupNotification({
        type: 'continueGiftSubscription:failed',
        autoHide: false,
        closeable: true,
        state,
        status: 'error',
        message: t('Failed to process checkout, please try again'),
      }),
    };
  }
}

async function checkoutGift({ data, state, api }) {
  try {
    const {
      tierId,
      cadence,
      duration,
      email,
      deliveryMethod,
      recipientEmail,
      recipientName,
      buyerName,
      personalMessage,
      deliveryDate,
    } = data;
    await api.member.checkoutGift({
      tierId,
      ...(duration === undefined ? { cadence } : { duration }),
      ...(email ? { email } : {}),
      ...(deliveryMethod !== undefined ? { deliveryMethod } : {}),
      ...(recipientEmail ? { recipientEmail } : {}),
      ...(recipientName ? { recipientName } : {}),
      ...(buyerName ? { buyerName } : {}),
      ...(personalMessage ? { personalMessage } : {}),
      ...(deliveryDate ? { deliveryDate } : {}),
    });
    return {
      action: 'checkoutGift:success',
    };
  } catch (e) {
    return {
      action: 'checkoutGift:failed',
      popupNotification: createPopupNotification({
        type: 'checkoutGift:failed',
        autoHide: false,
        closeable: true,
        state,
        status: 'error',
        message: t('Failed to process checkout, please try again'),
      }),
    };
  }
}

async function updateSubscription({ data, state, api }) {
  try {
    const { plan, planId, subscriptionId, cancelAtPeriodEnd } = data;
    const { tierId, cadence } = getProductCadenceFromPrice({ site: state?.site, priceId: planId });

    await api.member.updateSubscription({
      planName: plan,
      tierId,
      cadence,
      subscriptionId,
      cancelAtPeriodEnd,
      planId: planId,
    });
    const member = await api.member.sessionData();
    const action = 'updateSubscription:success';
    return {
      action,
      popupNotification: createPopupNotification({
        type: action,
        autoHide: true,
        closeable: true,
        state,
        status: 'success',
        message: t('Subscription plan updated successfully'),
      }),
      page: 'accountHome',
      member: member,
    };
  } catch (e) {
    return {
      action: 'updateSubscription:failed',
      popupNotification: createPopupNotification({
        type: 'updateSubscription:failed',
        autoHide: false,
        closeable: true,
        state,
        status: 'error',
        message: t('Failed to update subscription, please try again'),
      }),
    };
  }
}

async function cancelSubscription({ data, state, api }) {
  try {
    const { subscriptionId, cancellationReason } = data;
    await api.member.updateSubscription({
      subscriptionId,
      smartCancel: true,
      cancellationReason,
    });
    const member = await api.member.sessionData();
    const action = 'cancelSubscription:success';
    return {
      action,
      page: 'accountHome',
      member: member,
      reloadOnPopupClose: true,
    };
  } catch (e) {
    return {
      action: 'cancelSubscription:failed',
      popupNotification: createPopupNotification({
        type: 'cancelSubscription:failed',
        autoHide: false,
        closeable: true,
        state,
        status: 'error',
        message: t('Failed to cancel subscription, please try again'),
      }),
    };
  }
}

async function continueSubscription({ data, state, api }) {
  try {
    const { subscriptionId } = data;
    await api.member.updateSubscription({
      subscriptionId,
      cancelAtPeriodEnd: false,
    });
    const member = await api.member.sessionData();
    const action = 'continueSubscription:success';
    return {
      action,
      page: 'accountHome',
      member: member,
      reloadOnPopupClose: true,
    };
  } catch (e) {
    return {
      action: 'continueSubscription:failed',
      popupNotification: createPopupNotification({
        type: 'continueSubscription:failed',
        autoHide: false,
        closeable: true,
        state,
        status: 'error',
        message: t('Failed to cancel subscription, please try again'),
      }),
    };
  }
}

async function applyOffer({ data, state, api }) {
  try {
    const { offerId, subscriptionId } = data;
    await api.member.applyOffer({
      offerId,
      subscriptionId,
    });
    const member = await api.member.sessionData();
    const action = 'applyOffer:success';
    return {
      action,
      page: 'accountHome',
      member: member,
      offers: [],
      reloadOnPopupClose: true,
      popupNotification: createPopupNotification({
        type: 'applyOffer:success',
        autoHide: true,
        closeable: true,
        state,
        status: 'success',
        message: 'Offer applied successfully!',
      }),
    };
  } catch (e) {
    return {
      action: 'applyOffer:failed',
      popupNotification: createPopupNotification({
        type: 'applyOffer:failed',
        autoHide: false,
        closeable: true,
        state,
        status: 'error',
        message: 'Failed to apply offer, please try again',
      }),
    };
  }
}

async function editBilling({ data, state, api }) {
  try {
    await api.member.editBilling(data);
  } catch (e) {
    return {
      action: 'editBilling:failed',
      popupNotification: createPopupNotification({
        type: 'editBilling:failed',
        autoHide: false,
        closeable: true,
        state,
        status: 'error',
        message: t('Failed to update billing information, please try again'),
      }),
    };
  }
}

async function manageBilling({ data, state, api }) {
  try {
    await api.member.manageBilling(data);
  } catch (e) {
    return {
      action: 'manageBilling:failed',
      popupNotification: createPopupNotification({
        type: 'manageBilling:failed',
        autoHide: false,
        closeable: true,
        state,
        status: 'error',
        message: t('Failed to open billing portal, please try again'),
      }),
    };
  }
}

async function clearPopupNotification() {
  return {
    popupNotification: null,
  };
}

async function showPopupNotification({ data, state }) {
  let { action, message = '' } = data;
  action = action || 'showPopupNotification:success';
  return {
    popupNotification: createPopupNotification({
      type: action,
      autoHide: true,
      closeable: true,
      state,
      status: 'success',
      message,
    }),
  };
}

async function updateNewsletterPreference({ data, state, api }) {
  try {
    const { newsletters, enableCommentNotifications, enableUpdatesAndAnnouncements } = data;
    if (
      !newsletters &&
      enableCommentNotifications === undefined &&
      enableUpdatesAndAnnouncements === undefined
    ) {
      return {};
    }
    const updateData = {};
    if (newsletters) {
      updateData.newsletters = newsletters;
    }
    if (enableCommentNotifications !== undefined) {
      updateData.enableCommentNotifications = enableCommentNotifications;
    }
    if (enableUpdatesAndAnnouncements !== undefined) {
      updateData.enableUpdatesAndAnnouncements = enableUpdatesAndAnnouncements;
    }
    const member = await api.member.update(updateData);
    const action = 'updateNewsletterPref:success';
    return {
      action,
      member,
    };
  } catch (e) {
    return {
      action: 'updateNewsletterPref:failed',
      popupNotification: createPopupNotification({
        type: 'updateNewsletter:failed',
        autoHide: true,
        closeable: true,
        state,
        status: 'error',
        message: t('Failed to update newsletter settings'),
      }),
    };
  }
}

async function removeEmailFromSuppressionList({ state, api }) {
  try {
    await api.member.deleteSuppression();
    const action = 'removeEmailFromSuppressionList:success';
    return {
      action,
      popupNotification: createPopupNotification({
        type: 'removeEmailFromSuppressionList:success',
        autoHide: true,
        closeable: true,
        state,
        status: 'success',
        message: t('You have been successfully resubscribed'),
      }),
    };
  } catch (e) {
    return {
      action: 'removeEmailFromSuppressionList:failed',
      popupNotification: createPopupNotification({
        type: 'removeEmailFromSuppressionList:failed',
        autoHide: true,
        closeable: true,
        state,
        status: 'error',
        message: t('Your email has failed to resubscribe, please try again'),
      }),
    };
  }
}

async function updateNewsletter({ data, state, api }) {
  try {
    const { subscribed } = data;
    const member = await api.member.update({ subscribed });
    if (!member) {
      throw new Error('Failed to update newsletter');
    }
    const action = 'updateNewsletter:success';
    return {
      action,
      member: member,
      popupNotification: createPopupNotification({
        type: action,
        autoHide: true,
        closeable: true,
        state,
        status: 'success',
        message: t('Email newsletter settings updated'),
      }),
    };
  } catch (e) {
    return {
      action: 'updateNewsletter:failed',
      popupNotification: createPopupNotification({
        type: 'updateNewsletter:failed',
        autoHide: true,
        closeable: true,
        state,
        status: 'error',
        message: t('Failed to update newsletter settings'),
      }),
    };
  }
}

async function updateMemberEmail({ data, state, api }) {
  const { email } = data;
  const originalEmail = getMemberEmail({ member: state.member });
  if (email !== originalEmail) {
    try {
      await api.member.updateEmailAddress({ email });
      return {
        success: true,
      };
    } catch (err) {
      return {
        success: false,
        error: err,
      };
    }
  }
  return null;
}

async function updateMemberData({ data, state, api }) {
  const name = data?.name?.trim();
  const metafields = data?.metafields;
  const originalName = getMemberName({ member: state.member });

  if (originalName !== name || metafields) {
    try {
      const member = await api.member.update({ name, metafields });
      if (!member) {
        throw new Error('Failed to update member');
      }
      return {
        member,
        success: true,
      };
    } catch (err) {
      return {
        success: false,
        error: err,
      };
    }
  }
  return null;
}

async function refreshMemberData({ state, api }) {
  if (state.member) {
    try {
      const member = await api.member.sessionData();
      if (member) {
        return {
          member,
          success: true,
          action: 'refreshMemberData:success',
        };
      }
      return null;
    } catch (err) {
      return {
        success: false,
        error: err,
        action: 'refreshMemberData:failed',
      };
    }
  }
  return null;
}

/**
 * Where the site's refusal of a value belongs: on the input that holds it, or, when no
 * one input does, in the notification.
 *
 * A composite is drawn as several inputs under one name, so a refusal that named only
 * the field would leave a member reading that their address is wrong against six boxes
 * with nothing saying which. A refusal that names a part is keyed by the name the page
 * gives that part's input, so the box itself carries the message, the way a malformed
 * email address does.
 */
function refusalOf(error, state, fallback) {
  // The site names every value it refused. The error's own message and property are the
  // first of them, so one refusal and several are read the same way.
  const refusals = error?.details?.length
    ? error.details
    : [{ property: error?.property, message: error?.message }];

  const fieldErrors = {};
  let sentence = null;

  for (const refusal of refusals) {
    const placed = placeRefusal(refusal, state);
    if (placed.input) {
      fieldErrors[placed.input] = placed.message;
    } else if (placed.sentence && !sentence) {
      // The first that belongs to no input. The rest are on the inputs themselves, and
      // a notification saying several things at once says none of them well.
      sentence = placed.sentence;
    }
  }

  return { fieldErrors, message: sentence ?? fallback };
}

/**
 * Where one refusal belongs: on the input that holds the value, or, when no one input
 * does, in the notification.
 */
function placeRefusal({ property, message }, state) {
  // The server names a refused value as `metafields.custom.<key>[.<part>]`. Read as text
  // or not at all: this is the path that explains a failure, and it reaching for `split`
  // on something that is not a string would fail while reporting that something failed.
  const named = typeof property === 'string' ? property : '';
  const [qualifier, , key, ...partPath] = named.split('.');
  if (qualifier !== 'metafields') {
    return {};
  }

  const said = chooseBestErrorMessage({ message });
  const field = state.customFields?.find((f) => f.key === key);

  // A refusal of the write rather than of a value — too many fields at once, say — names
  // no field, and this build may not know the one it does name. Either way there is no
  // input to mark, and the server's sentence is the only thing that says what happened.
  if (!field) {
    return { sentence: said };
  }

  const part = partPath.join('.');

  // A refusal of the whole of a composite — the field archived, or closed to members,
  // while the page was open — belongs to no one box, and there is no box named for the
  // field itself to put it in. It stays in the notification, with the field named:
  // nothing the member retypes would fix it anyway.
  if (!part && subFieldsOf(field.type)) {
    return { sentence: t('{field}: {message}', { field: field.name, message: said }) };
  }

  // A part the field does not declare has no box on the page, and marking a box that is
  // not there would say nothing while still counting as something said, leaving the save
  // to fail in silence. The rows drawn cannot drift from what the field declares: they
  // are typed to its parts, and every one of them must be given words.
  if (part && !(subFieldsOf(field.type) ?? []).includes(part)) {
    return { sentence: t('{field}: {message}', { field: field.name, message: said }) };
  }

  return { input: part ? `custom:${field.key}:${part}` : `custom:${field.key}`, message: said };
}

/**
 * What a member is told about a failed save, beyond the inputs themselves.
 *
 * Nothing, when the inputs are already saying it: the boxes are marked, each carries its
 * reason, and the button offers to try again, so a notification over the top of that
 * repeats what is already on the page. A failure no input can show — the site unreachable,
 * a verification mail refused, a field this build cannot place — has nowhere else to go.
 */
function failureNotification({ fieldErrors, message, state }) {
  if (Object.keys(fieldErrors).length > 0) {
    return null;
  }
  return createPopupNotification({
    type: 'updateProfile:failed',
    autoHide: true,
    closeable: true,
    status: 'error',
    message,
    state,
  });
}

async function updateProfile({ data, state, api }) {
  const [dataUpdate, emailUpdate] = await Promise.all([
    updateMemberData({ data, state, api }),
    updateMemberEmail({ data, state, api }),
  ]);
  if (dataUpdate && emailUpdate) {
    // Both halves, not just the email: a verification mail going out says nothing about
    // whether the values saved, and reporting success for a refused write both loses
    // what the member typed and leaves the page before they could see why.
    if (emailUpdate.success && dataUpdate.success) {
      return {
        action: 'updateProfile:success',
        ...(dataUpdate.success ? { member: dataUpdate.member } : {}),
        page: 'accountHome',
        popupNotification: createPopupNotification({
          type: 'updateProfile:success',
          autoHide: true,
          closeable: true,
          status: 'success',
          state,
          message: t('Check your inbox to verify email update'),
        }),
      };
    }

    const refusal = dataUpdate.success
      ? { fieldErrors: {}, message: t('Failed to send verification email') }
      : refusalOf(dataUpdate.error, state, t('Failed to update account data'));
    return {
      action: 'updateProfile:failed',
      fieldErrors: refusal.fieldErrors,
      ...(dataUpdate.success ? { member: dataUpdate.member } : {}),
      popupNotification: failureNotification({ ...refusal, state }),
    };
  } else if (dataUpdate) {
    const action = dataUpdate.success ? 'updateProfile:success' : 'updateProfile:failed';
    const status = dataUpdate.success ? 'success' : 'error';
    const refusal = dataUpdate.success
      ? { fieldErrors: {}, message: t('Account details updated successfully') }
      : refusalOf(dataUpdate.error, state, t('Failed to update account details'));
    return {
      action,
      fieldErrors: refusal.fieldErrors,
      ...(dataUpdate.success ? { member: dataUpdate.member } : {}),
      ...(dataUpdate.success ? { page: 'accountHome' } : {}),
      popupNotification: dataUpdate.success
        ? createPopupNotification({
            type: action,
            autoHide: true,
            closeable: true,
            status,
            state,
            message: refusal.message,
          })
        : failureNotification({ ...refusal, state }),
    };
  } else if (emailUpdate) {
    const action = emailUpdate.success ? 'updateProfile:success' : 'updateProfile:failed';
    const status = emailUpdate.success ? 'success' : 'error';
    let message = '';
    const fieldErrors = {};

    if (emailUpdate.error) {
      message = chooseBestErrorMessage(emailUpdate.error, t('Failed to send verification email'));
    } else {
      message = t('Check your inbox to verify email update');
    }

    return {
      action,
      fieldErrors,
      ...(emailUpdate.success ? { page: 'accountHome' } : {}),
      popupNotification: createPopupNotification({
        type: action,
        autoHide: emailUpdate.success,
        closeable: true,
        status,
        state,
        message,
      }),
    };
  }
  return {
    action: 'updateProfile:success',
    page: 'accountHome',
    popupNotification: createPopupNotification({
      type: 'updateProfile:success',
      autoHide: true,
      closeable: true,
      status: 'success',
      state,
      message: t('Account details updated successfully'),
    }),
  };
}

async function oneClickSubscribe({ data: { siteUrl }, state }) {
  const externalSiteApi = setupGhostApi({
    siteUrl: siteUrl,
    apiUrl: 'not-defined',
    contentApiKey: 'not-defined',
  });
  const { member } = state;

  const referrerUrl = window.location.href;
  const referrerSource = getRefDomain();

  const integrityToken = await externalSiteApi.member.getIntegrityToken();
  await externalSiteApi.member.sendMagicLink({
    emailType: 'signup',
    name: member.name,
    email: member.email,
    autoRedirect: false,
    integrityToken,
    customUrlHistory: state.site.outbound_link_tagging
      ? [
          {
            time: Date.now(),
            referrerSource,
            referrerMedium: 'Ghost Recommendations',
            referrerUrl,
          },
        ]
      : [],
  });

  return {};
}

function trackRecommendationClicked({ data: { recommendationId }, api }) {
  try {
    const existing = localStorage.getItem('ghost-recommendations-clicked');
    const clicked = existing ? JSON.parse(existing) : [];
    if (clicked.includes(recommendationId)) {
      // Already tracked
      return;
    }
    clicked.push(recommendationId);
    localStorage.setItem('ghost-recommendations-clicked', JSON.stringify(clicked));
  } catch (e) {
    // Ignore localstorage errors (browser not supported or in private mode)
  }
  api.recommendations.trackClicked({
    recommendationId,
  });

  return {};
}

async function trackRecommendationSubscribed({ data: { recommendationId }, api }) {
  api.recommendations.trackSubscribed({
    recommendationId,
  });

  return {};
}

const Actions = {
  togglePopup,
  openPopup,
  closePopup,
  switchPage,
  openNotification,
  closeNotification,
  back,
  signout,
  signin,
  startSigninOTCFromCustomForm,
  verifyOTC,
  signup,
  redeemGift,
  updateSubscription,
  cancelSubscription,
  continueSubscription,
  applyOffer,
  updateNewsletter,
  updateProfile,
  refreshMemberData,
  clearPopupNotification,
  editBilling,
  manageBilling,
  checkoutPlan,
  continueGiftSubscription,
  checkoutGift,
  updateNewsletterPreference,
  showPopupNotification,
  removeEmailFromSuppressionList,
  oneClickSubscribe,
  trackRecommendationClicked,
  trackRecommendationSubscribed,
};

/** Handle actions in the App, returns updated state */
export default async function ActionHandler({ action, data, state, api }) {
  const handler = Actions[action];
  if (handler) {
    return (await handler({ data, state, api })) || {};
  }
  return {};
}
