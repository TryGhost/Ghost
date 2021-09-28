module.exports = class CustomThemeSettingsCache {
    constructor() {
        this.content = new Object();
    }

    get(key) {
        return this.content[key].value;
    }

    getAll() {
        return this.content;
    }

    populate(settings) {
        this.clear();

        settings.forEach((setting) => {
            this.content[setting.key] = setting.value;
        });
    }

    clear() {
        for (const key in this.content) {
            delete this.content[key];
        }
    }
};
