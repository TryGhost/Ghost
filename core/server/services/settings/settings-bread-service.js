const tpl = require('@tryghost/tpl');
const {NotFoundError, NoPermissionError} = require('@tryghost/errors');

const messages = {
    problemFindingSetting: 'Problem finding setting: {key}',
    accessCoreSettingFromExtReq: 'Attempted to access core setting from external request'
};

// The string returned when a setting is set as write-only
const obfuscatedSetting = '••••••••';

// The function used to decide whether a setting is write-only
function isSecretSetting(setting) {
    return /secret/.test(setting.key);
}

// The function that obfuscates a write-only setting
function hideValueIfSecret(setting) {
    if (setting.value && isSecretSetting(setting)) {
        return {...setting, value: obfuscatedSetting};
    }
    return setting;
}

class SettingsBREADService {
    /**
     *
     * @param {Object} options
     * @param {Object} options.settingsCache - SettingsCache instance
     */
    constructor({settingsCache}) {
        this.settingsCache = settingsCache;
    }

    /**
     *
     * @param {String} key setting key
     * @param {Object} [context] API context instance
     * @returns {Object} an object with a filled out key that comes in a parameter
     */
    read(key, context) {
        let setting;

        if (key === 'slack') {
            const slackURL = this.settingsCache.get('slack_url', {resolve: false});
            const slackUsername = this.settingsCache.get('slack_username', {resolve: false});

            setting = slackURL || slackUsername;
            setting.key = 'slack';
            setting.value = [{
                url: slackURL && slackURL.value,
                username: slackUsername && slackUsername.value
            }];
        } else {
            setting = this.settingsCache.get(key, {resolve: false});
        }

        if (!setting) {
            return Promise.reject(new NotFoundError({
                message: tpl(messages.problemFindingSetting, {
                    key: key
                })
            }));
        }

        // @TODO: handle in settings model permissible fn
        if (setting.group === 'core' && !(context && context.internal)) {
            return Promise.reject(new NoPermissionError({
                message: tpl(messages.accessCoreSettingFromExtReq)
            }));
        }

        setting = hideValueIfSecret(setting);

        return {
            [key]: setting
        };
    }
}

module.exports = SettingsBREADService;
