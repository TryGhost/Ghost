import Ember from 'ember';

const {Service, _ProxyMixin, computed} = Ember;

function isNumeric(num) {
    return Ember.$.isNumeric(num);
}

function _mapType(val) {
    if (val === '') {
        return null;
    } else if (val === 'true') {
        return true;
    } else if (val === 'false') {
        return false;
    } else if (isNumeric(val)) {
        return +val;
    } else if (val.indexOf('{') === 0) {
        try {
            return JSON.parse(val);
        } catch (e) {
            /*jshint unused:false */
            return val;
        }
    } else {
        return val;
    }
}

export default Service.extend(_ProxyMixin, {
    content: computed(function () {
        let metaConfigTags = Ember.$('meta[name^="env-"]');
        let config = {};

        metaConfigTags.each((i, el) => {
            let key = el.name;
            let value = el.content;
            let propertyName = key.substring(4);

            config[propertyName] = _mapType(value);
        });

        return config;
    })
});
