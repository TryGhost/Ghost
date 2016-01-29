import Ember from 'ember';

const {Service, _ProxyMixin, computed} = Ember;

function isNumeric(num) {
    return Ember.$.isNumeric(num);
}

function _mapType(val, type) {
    if (val === '') {
        return null;
    } else if (type === 'bool') {
        return (val === 'true') ? true : false;
    } else if (type === 'int' && isNumeric(val)) {
        return +val;
    } else if (type === 'json') {
        try {
            return JSON.parse(val);
        } catch (e) {
            return val;
        }
    } else { // assume string if type is null or matches nothing else
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
            let type = el.getAttribute('data-type');

            let propertyName = key.substring(4);

            config[propertyName] = _mapType(value, type);
        });

        return config;
    })
});
