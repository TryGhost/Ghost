import Ember from 'ember';

const {
    Service,
    computed,
    inject: {service}
} = Ember;

export default Service.extend({
    store: service(),

    _parseTimezones(settings) {
        let activeTimezone = settings.get('activeTimezone');
        return activeTimezone;
    },

    _settings: computed(function () {
        let store = this.get('store');
        return store.queryRecord('setting', {type: 'blog,theme,private'});
    }),

    offset: computed('_settings.activeTimezone', function () {
        return this.get('_settings').then((settings) => {
            return this._parseTimezones(settings);
        });
    })

});
