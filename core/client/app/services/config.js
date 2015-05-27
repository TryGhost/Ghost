import Ember from 'ember';

function isNumeric(num) {
    return !isNaN(num);
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

export default Ember.Service.extend(Ember._ProxyMixin, {
    content: Ember.computed(function () {
        var metaConfigTags = Ember.$('meta[name^="env-"]'),
        config = {};

        metaConfigTags.each(function (i, el) {
            var key = el.name,
                value = el.content,
                propertyName = key.substring(4);

            config[propertyName] = _mapType(value);
        });

        return config;
    })
});
