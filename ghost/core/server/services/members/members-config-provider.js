class MembersConfigProvider {
  /**
   * @param {object} options
   * @param {{get: (key: string) => any}} options.settingsCache
   * @param {{getDefaultEmailDomain(): string, getMembersSupportAddress(): string, getNoReplyAddress(): string, isStripeConnected(): boolean}} options.settingsHelpers
   * @param {any} options.urlUtils
   */
  constructor({ settingsCache, settingsHelpers, urlUtils }) {
    this._settingsCache = settingsCache;
    this._settingsHelpers = settingsHelpers;
    this._urlUtils = urlUtils;
  }

  get defaultEmailDomain() {
    return this._settingsHelpers.getDefaultEmailDomain();
  }

  /**
   * @deprecated Use settingsHelpers.getNoReplyAddress or settingsHelpers.getMembersSupportAddress instead
   */
  getEmailFromAddress() {
    // Individual from addresses are set per newsletter - this is the fallback address
    return this._settingsHelpers.getNoReplyAddress();
  }

  /**
   * @deprecated Use settingsHelpers.getNoReplyAddress or settingsHelpers.getMembersSupportAddress instead
   */
  getEmailSupportAddress() {
    return this._settingsHelpers.getMembersSupportAddress();
  }

  /**
   * @deprecated Use settingsHelpers.isStripeConnected instead
   */
  isStripeConnected() {
    return this._settingsHelpers.isStripeConnected();
  }

  getAllowSelfSignup() {
    // Free signups are allowed only if the site subscription is set to "Full-access"
    // It is blocked for "Invite-only", "Paid-members-only" and "None" accesses
    return this._settingsCache.get('members_signup_access') === 'all';
  }

  getTokenIssuer() {
    return this._urlUtils.urlFor({ relativeUrl: '/members/api' }, true);
  }

  /**
   * @param {string} token
   * @param {string} type - also known as "action", e.g. "signin" or "signup"
   * @param {string} [referrer] - optional URL for redirecting to after signin
   * @param {string} [otcVerification] - optional for verifying an OTC signin redirect
   * @returns {string}
   */
  getSigninURL(token, type, referrer, otcVerification) {
    const siteUrl = this._urlUtils.urlFor({ relativeUrl: '/members/' }, true);
    const signinURL = new URL(siteUrl);
    signinURL.searchParams.set('token', token);
    signinURL.searchParams.set('action', type);
    if (referrer) {
      signinURL.searchParams.set('r', referrer);
    }
    if (otcVerification) {
      signinURL.searchParams.set('otc_verification', otcVerification);
    }
    return signinURL.toString();
  }
}

module.exports = MembersConfigProvider;
