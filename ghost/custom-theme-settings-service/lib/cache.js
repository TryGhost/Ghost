const BREAD = require('./bread');
const {GhostError} = require('@tryghost/errors');

module.exports = class CustomThemeSettingsCache {
    constructor() {
        this.content = new Object();
    }

    init({model}) {
        this.repository = new BREAD({model});
    }

    get(key) {
        this._noUsageBeforeInit();

        return this.content[key].value;
    }

    getAll() {
        this._noUsageBeforeInit();

        return this.content;
    }

    async populateForTheme(themeName) {
        this._noUsageBeforeInit();

        const settingsCollection = await this.repository.browse({theme: themeName});
        const settingsJson = settingsCollection.toJSON();

        this.content = new Object();

        settingsJson.forEach((setting) => {
            this.content[setting.key] = setting.value;
        });
    }

    _noUsageBeforeInit() {
        if (!this.repository) {
            throw new GhostError('CustomThemeSettingsCache must have .init({model}) called before being used');
        }
    }
};
