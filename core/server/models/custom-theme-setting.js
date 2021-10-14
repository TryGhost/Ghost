const _ = require('lodash');
const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');

const CustomThemeSetting = ghostBookshelf.Model.extend({
    tableName: 'custom_theme_settings',

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);
        const settingType = attrs.type;

        // transform "0" to false for boolean type
        if (settingType === 'boolean' && (attrs.value === '0' || attrs.value === '1')) {
            attrs.value = !!+attrs.value;
        }

        // transform "false" to false for boolean type
        if (settingType === 'boolean' && (attrs.value === 'false' || attrs.value === 'true')) {
            attrs.value = JSON.parse(attrs.value);
        }

        // transform URLs to absolute for image settings
        if (settingType === 'image' && attrs.value) {
            attrs.value = urlUtils.transformReadyToAbsolute(attrs.value);
        }

        return attrs;
    },

    format() {
        const attrs = ghostBookshelf.Model.prototype.format.apply(this, arguments);
        const settingType = attrs.type;

        if (settingType === 'boolean') {
            // CASE: Ensure we won't forward strings, otherwise model events or model interactions can fail
            if (attrs.value === '0' || attrs.value === '1') {
                attrs.value = !!+attrs.value;
            }

            // CASE: Ensure we won't forward strings, otherwise model events or model interactions can fail
            if (attrs.value === 'false' || attrs.value === 'true') {
                attrs.value = JSON.parse(attrs.value);
            }

            if (_.isBoolean(attrs.value)) {
                attrs.value = attrs.value.toString();
            }
        }

        return attrs;
    },

    formatOnWrite(attrs) {
        if (attrs.type === 'image' && attrs.value) {
            attrs.value = urlUtils.toTransformReady(attrs.value);
        }

        return attrs;
    }
});

module.exports = {
    CustomThemeSetting: ghostBookshelf.model('CustomThemeSetting', CustomThemeSetting)
};
