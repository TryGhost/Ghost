import Ember from 'ember';

const {
    Service,
    _ProxyMixin,
    computed,
    inject: {service}
} = Ember;

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
    ajax: service(),
    ghostPaths: service(),

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
    }),

    availableTimezones: computed(function() {
        let timezonesUrl = this.get('ghostPaths.url').api('configuration', 'timezones');

        return this.get('ajax').request(timezonesUrl).then((configTimezones) => {
            let [ timezonesObj ] = configTimezones.configuration;

            timezonesObj = timezonesObj.timezones;

            return timezonesObj;
        });
    })
});
