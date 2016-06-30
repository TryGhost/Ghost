import Service from 'ember-service';
import computed from 'ember-computed';
import injectService from 'ember-service/inject';

export default Service.extend({
    store: injectService(),

    _parseTimezones(settings) {
        let activeTimezone = settings.get('activeTimezone');
        return activeTimezone;
    },

    _settings: computed(function () {
        let store = this.get('store');
        return store.queryRecord('setting', {type: 'blog,theme,private'});
    }),

    blogTimezone: computed('_settings.activeTimezone', function () {
        return this.get('_settings').then((settings) => {
            return this._parseTimezones(settings);
        });
    })

});
