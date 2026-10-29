import { type Setting, getSettingValue } from '@tryghost/admin-x-framework/api/settings';

/**
 * Invite-only sites block new members, so a gift recipient who isn't already
 * a member couldn't join to redeem. Gifts are hidden there; saved gift
 * settings are kept for when the site opens signups again.
 */
export function signupAccessAllowsGifts(settings: Setting[] | null | undefined): boolean {
  return getSettingValue<string>(settings ?? [], 'members_signup_access') !== 'invite';
}
