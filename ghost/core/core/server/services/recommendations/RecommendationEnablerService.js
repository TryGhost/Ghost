module.exports = class RecommendationEnablerService {
    /** @type {import('../settings/SettingsBREADService')} */
    #settingsService;

    /**
     * @param {object} deps
     * @param {import('../settings/SettingsBREADService')} deps.settingsService
     */
    constructor(deps) {
        this.#settingsService = deps.settingsService;
    }

    /**
     * @returns {string}
     */
    getSetting() {
        return this.#settingsService.read('recommendations_enabled');
    }

    /**
     *
     * @param {string} value
     * @returns Promise<void>
     */
    async setSetting(value) {
        this.#settingsService.edit([{key: 'recommendations_enabled', value}], {context: {internal: true}});
    }
};
