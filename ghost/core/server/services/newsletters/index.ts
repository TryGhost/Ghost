import { defineService } from '../../../kernel/define-service';

const MAGIC_LINK_TOKEN_VALIDITY = 24 * 60 * 60 * 1000;
const MAGIC_LINK_TOKEN_VALIDITY_AFTER_USAGE = 10 * 60 * 1000;
const MAGIC_LINK_TOKEN_MAX_USAGE_COUNT = 7;

export default defineService('Newsletters', () => {
  const NewslettersService = require('./newsletters-service');
  const SingleUseTokenProvider = require('../members/single-use-token-provider');
  const models = require('../../models');

  return new NewslettersService({
    NewsletterModel: models.Newsletter,
    MemberModel: models.Member,
    mail: require('../../lib/mail'),
    singleUseTokenProvider: new SingleUseTokenProvider({
      SingleUseTokenModel: models.SingleUseToken,
      validityPeriod: MAGIC_LINK_TOKEN_VALIDITY,
      validityPeriodAfterUsage: MAGIC_LINK_TOKEN_VALIDITY_AFTER_USAGE,
      maxUsageCount: MAGIC_LINK_TOKEN_MAX_USAGE_COUNT,
    }),
    urlUtils: require('../../../shared/url-utils').default,
    limitService: require('../limits').limitService,
    labs: require('../../../shared/labs'),
    emailAddressService: require('../email-address'),
    logging: require('@tryghost/logging'),
    sentry: require('../../../shared/sentry'),
  });
});
