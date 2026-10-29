const MemberWelcomeEmailService = require('./member-welcome-email-service');
const MemberWelcomeEmailRenderer = require('./member-welcome-email-renderer');

const VERIFICATION_TOKEN_VALIDITY = 24 * 60 * 60 * 1000;
const VERIFICATION_TOKEN_VALIDITY_AFTER_USAGE = 10 * 60 * 1000;
const VERIFICATION_TOKEN_MAX_USAGE_COUNT = 7;

class MemberWelcomeEmailServiceWrapper {
  init() {
    if (this.api) {
      return;
    }

    const settingsCache = require('../../../shared/settings-cache');

    if (!this.i18n) {
      const i18nLib = require('@tryghost/i18n').default;
      const events = require('../../lib/common/events');

      this.i18n = i18nLib(settingsCache.get('locale') || 'en', 'ghost');

      events.on('settings.locale.edited', (model) => {
        this.i18n.changeLanguage(model.get('value'));
      });
    }

    const logging = require('@tryghost/logging');
    const config = require('../../../shared/config');
    const labs = require('../../../shared/labs');
    const sentry = require('../../../shared/sentry');
    const urlUtils = require('../../../shared/url-utils').default;
    const models = require('../../models');
    const mail = require('../../lib/mail');
    const MailgunClient = require('../../lib/mailgun/mailgun-client');
    const emailAddressService = require('../email-address');
    const settingsHelpers = require('../settings-helpers');
    const linkTracking = require('../link-tracking');
    const { registerHelpers } = require('../email-service/helpers/register-helpers');
    const verifyEmailTemplate = require('../newsletters/emails/verify-email');
    const SingleUseTokenProvider = require('../members/single-use-token-provider');

    emailAddressService.init();

    const renderer = new MemberWelcomeEmailRenderer({
      t: this.i18n.t,
      dir: this.i18n.dir.bind(this.i18n),
      labs,
      urlUtils,
      registerHelpers,
      // Tracked renders still initialize link tracking on demand until boot owns the order.
      linkTracking: {
        async addAutomationTrackingToUrl(...args) {
          await linkTracking.init();
          return await linkTracking.service.addAutomationTrackingToUrl(...args);
        },
      },
    });

    this.api = new MemberWelcomeEmailService({
      logging,
      config,
      labs,
      sentry,
      settingsCache,
      urlUtils,
      models: {
        Automation: models.Automation,
        EmailDesignSetting: models.EmailDesignSetting,
        Newsletter: models.Newsletter,
      },
      emailAddressService: emailAddressService.service,
      settingsHelpers,
      transactionalMailer: new mail.GhostMailer(),
      bulkMailer: new MailgunClient({ config, settings: settingsCache }),
      renderer,
      verifyEmailTemplate,
      singleUseTokenProvider: new SingleUseTokenProvider({
        SingleUseTokenModel: models.SingleUseToken,
        validityPeriod: VERIFICATION_TOKEN_VALIDITY,
        validityPeriodAfterUsage: VERIFICATION_TOKEN_VALIDITY_AFTER_USAGE,
        maxUsageCount: VERIFICATION_TOKEN_MAX_USAGE_COUNT,
      }),
    });
  }
}

module.exports = new MemberWelcomeEmailServiceWrapper();
