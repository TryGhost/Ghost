module.exports = class CustomThemeSettingsCache {
    constructor() {
        this._content = new Object();
    }

    get(key) {
        return this._content[key];
    }

    getAll() {
        return Object.assign({}, this._content);
    }

    populate(settings) {
        this.clear();

        settings.forEach((setting) => {
            this._content[setting.key] = setting.value;
        });
    }

    clear() {
        for (const key in this._content) {
            delete this._content[key];
        }
    }
};
