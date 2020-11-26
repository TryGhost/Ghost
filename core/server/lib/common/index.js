const awilix = require('awilix');
const container = awilix.createContainer({
    injectionMode: awilix.InjectionMode.PROXY
});

const {I18n} = require('./i18n');
const PackageJSON = require('../fs/package-json/package-json');

container.register({
    i18n: awilix.asClass(I18n).singleton()
});

container.register({
    packageJSON: awilix.asClass(PackageJSON).singleton()
});

module.exports = {
    get I18n() {
        return I18n;
    },

    get i18n() {
        return container.resolve('i18n');
    },

    get packageJSON() {
        return container.resolve('packageJSON');
    },

    get events() {
        return require('./events');
    }
};
