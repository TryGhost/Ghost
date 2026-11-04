import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { IncorrectUsageError } from '@tryghost/errors';
import { defineService } from '../../../kernel/define-service';

const VERIFICATION_TOKEN_VALIDITY = 24 * 60 * 60 * 1000;
const VERIFICATION_TOKEN_VALIDITY_AFTER_USAGE = 10 * 60 * 1000;
const VERIFICATION_TOKEN_MAX_USAGE_COUNT = 7;

// The renderer composes its own wrapper with the shared email partials. The loader closes over
// this fixed map, so the renderer can read exactly these files and nothing else, and it stays
// synchronous because the renderer registers the partials while it is constructed.
const TEMPLATE_FILES = {
  baseStyles: '../../lib/email-rendering/partials/base-styles.hbs',
  contentStyles: '../../lib/email-rendering/partials/content-styles.hbs',
  cardStyles: '../../lib/email-rendering/partials/card-styles.hbs',
  emailWrapper: '../../lib/email-rendering/partials/email-wrapper.hbs',
  styles: '../email-service/email-templates/partials/styles.hbs',
  wrapper: './email-templates/wrapper.hbs',
} as const;

type TemplateName = keyof typeof TEMPLATE_FILES;

function readTemplate(name: TemplateName): string {
  if (!Object.hasOwn(TEMPLATE_FILES, name)) {
    throw new IncorrectUsageError({
      message: `Unknown member welcome email template: ${String(name)}`,
    });
  }
  return readFileSync(path.join(__dirname, TEMPLATE_FILES[name]), 'utf8');
}

// Runs after the email address policy and link tracking are ready: the renderer tracks
// automation links through the ready link tracking instance instead of initializing it itself.
export default defineService('Member welcome emails', () => {
  const i18nLib = require('@tryghost/i18n').default;
  const logging = require('@tryghost/logging');
  const config = require('../../../shared/config');
  const labs = require('../../../shared/labs');
  const sentry = require('../../../shared/sentry');
  const settingsCache = require('../../../shared/settings-cache');
  const urlUtils = require('../../../shared/url-utils').default;
  const events = require('../../lib/common/events');
  const lexicalLib = require('../../lib/lexical');
  const mail = require('../../lib/mail');
  const MailgunClient = require('../../lib/mailgun/mailgun-client');
  const models = require('../../models');
  const emailAddress = require('../email-address');
  const linkTracking = require('../link-tracking');
  const settingsHelpers = require('../settings-helpers');
  const { registerHelpers } = require('../email-service/helpers/register-helpers');
  const verifyEmailTemplate = require('../newsletters/emails/verify-email');
  const SingleUseTokenProvider = require('../members/single-use-token-provider');
  const MemberWelcomeEmailRenderer = require('./member-welcome-email-renderer');
  const MemberWelcomeEmailService = require('./member-welcome-email-service');

  assert(
    emailAddress.service,
    'Email address policy must be initialized before Member welcome emails',
  );
  assert(linkTracking.service, 'Link tracking must be initialized before Member welcome emails');

  const i18n = i18nLib(settingsCache.get('locale') || 'en', 'ghost');

  const renderer = new MemberWelcomeEmailRenderer({
    t: i18n.t,
    dir: i18n.dir.bind(i18n),
    labs,
    urlUtils,
    registerHelpers,
    linkTracking: linkTracking.service,
    // Forwarded rather than captured: the Lexical facade builds its renderer lazily.
    renderLexical: (lexical: string, options: { target: 'email'; design: object }) =>
      lexicalLib.render(lexical, options),
    readTemplate,
  });

  const service = new MemberWelcomeEmailService({
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
    emailAddressService: emailAddress.service,
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

  // Subscribe last, so a construction failure leaves no listener behind for the retry.
  events.on('settings.locale.edited', (model: { get: (key: string) => string }) => {
    i18n.changeLanguage(model.get('value'));
  });

  return service;
});
