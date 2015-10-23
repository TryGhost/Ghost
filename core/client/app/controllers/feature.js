import Ember from 'ember';

export default Ember.Controller.extend(Ember.PromiseProxyMixin, {
    init: function () {
        var promise;

        promise = this.store.query('setting', {type: 'blog,theme'}).then(function (settings) {
            return settings.get('firstObject');
        });

        this.set('promise', promise);
    },

    setting: Ember.computed.alias('content'),

    labs: Ember.computed('isSettled', 'setting.labs', function () {
        var value = {};

        if (this.get('isFulfilled')) {
            try {
                value = JSON.parse(this.get('setting.labs') || {});
            } catch (err) {
                value = {};
            }
        }

        return value;
    }),

    publicAPI: Ember.computed('config.publicAPI', 'labs.publicAPI', function () {
        return this.get('config.publicAPI') || this.get('labs.publicAPI');
    })
});
