const MemberWelcomeEmailService = require('./member-welcome-email-service');
const SingleUseTokenProvider = require('../members/single-use-token-provider');

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.events
 * @param {object} deps.settingsCache
 */
module.exports = function createMemberWelcomeEmailService({models, events, settingsCache}) {
    let i18n = null;

    const wrapper = {
        api: null,
        init() {
            if (wrapper.api) {
                return;
            }

            if (!i18n) {
                const i18nLib = require('@tryghost/i18n');
                i18n = i18nLib(settingsCache.get('locale') || 'en', 'ghost');

                events.on('settings.locale.edited', (model) => {
                    i18n.changeLanguage(model.get('value'));
                });
            }

            wrapper.api = new MemberWelcomeEmailService({
                t: i18n.t,
                dir: i18n.dir.bind(i18n),
                singleUseTokenProvider: new SingleUseTokenProvider({
                    SingleUseTokenModel: models.SingleUseToken,
                    validityPeriod: 24 * 60 * 60 * 1000,
                    validityPeriodAfterUsage: 10 * 60 * 1000,
                    maxUsageCount: 7
                })
            });
        }
    };

    return wrapper;
};
