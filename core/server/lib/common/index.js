const Bottle = require('bottlejs');
const bottle = new Bottle();

const {I18n} = require('./i18n');
const PackageJSON = require('../fs/package-json/package-json');

bottle.service('i18n', I18n);
bottle.service('packageJSON', PackageJSON, 'i18n');

module.exports = {
    get I18n() {
        return I18n;
    },

    get i18n() {
        return bottle.container.i18n;
    },

    get packageJSON() {
        return bottle.container.packageJSON;
    },

    get events() {
        return require('./events');
    }
};
