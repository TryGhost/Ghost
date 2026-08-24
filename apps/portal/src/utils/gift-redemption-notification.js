import { getMemberTierName, getSubscriptionExpiry } from './helpers';
import { t } from './i18n';

// Standalone form, for when the duration stands on its own as a noun phrase:
// the gift card face, the duration picker ("6 months").
export function getGiftDurationLabel({ cadence, duration } = {}) {
  if (cadence === 'year') {
    return duration === 1 ? t('1 year') : t('{years} years', { years: duration });
  }

  return duration === 1 ? t('1 month') : t('{months} months', { months: duration });
}

// Attributive form, for when the duration modifies a following noun. English
// takes the singular unit there: "a 6 month Gold membership", not "a 6 months
// Gold membership". Must match the backend's getCadenceLabel so the delivery
// email and the redemption page describe the gift identically.
export function getGiftDurationAttributiveLabel({ cadence, duration } = {}) {
  // The duration catalogue tops out at 12 months, which resolves to a single
  // year, so a yearly gift is always "1 year". Multi-year durations need a
  // plural form here before the catalogue can offer them.
  if (cadence === 'year') {
    return t('1 year');
  }

  return duration === 1 ? t('1 month') : t('{months} month', { months: duration });
}

export function getGiftIntroduction({ buyerName, cadence, duration, siteTitle } = {}) {
  if (cadence === 'year') {
    if (buyerName && siteTitle) {
      return t('{buyerName} has gifted you a {duration}-year {tierName} membership to {siteTitle}');
    }
    if (siteTitle) {
      return t("You've been gifted a {duration}-year {tierName} membership to {siteTitle}");
    }
    return t("You've been gifted a {duration}-year {tierName} membership");
  }

  if (buyerName && siteTitle) {
    return t('{buyerName} has gifted you a {duration}-month {tierName} membership to {siteTitle}', {
      count: duration,
    });
  }
  if (siteTitle) {
    return t("You've been gifted a {duration}-month {tierName} membership to {siteTitle}", {
      count: duration,
    });
  }
  return t("You've been gifted a {duration}-month {tierName} membership", { count: duration });
}

export function getGiftRedemptionSuccessMessage({ member } = {}) {
  const tierName = getMemberTierName({ member });
  const expiryDate = getSubscriptionExpiry({ member });
  if (!tierName || !expiryDate) {
    return null;
  }
  return t('You now have access to {tierName} until {expiryDate}. Enjoy!', {
    tierName,
    expiryDate,
  });
}

export function getGiftRedemptionErrorMessage(error) {
  let subtitle = t('Something went wrong, please try again later.');

  if (error?.code) {
    switch (error.code) {
      case 'GIFT_NOT_FOUND':
        subtitle = t('This gift link is invalid.');
        break;
      case 'GIFT_REDEEMED':
        subtitle = t('This gift has already been redeemed.');
        break;
      case 'GIFT_CONSUMED':
        subtitle = t('This gift has already been consumed.');
        break;
      case 'GIFT_EXPIRED':
        subtitle = t('This gift has expired.');
        break;
      case 'GIFT_REFUNDED':
        subtitle = t('This gift has been refunded.');
        break;
      case 'GIFT_PAID_MEMBER':
        subtitle = t('You already have an active subscription.');
        break;
      case 'TOKEN_EXPIRED':
        subtitle = t('Email confirmation link expired.');
        break;
    }
  }

  return {
    title: t('Gift could not be redeemed'),
    subtitle,
  };
}
