import Ember from 'ember';
var FeatureController = Ember.Controller.extend(Ember.PromiseProxyMixin, {
    init: function () {
        var promise;

        promise = this.store.find('setting', {type: 'blog,theme'}).then(function (settings) {
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

    connectionsUI: Ember.computed('config.connectionsUI', 'labs.connectionsUI', function () {
        return this.get('config.connectionsUI') || this.get('labs.connectionsUI');
    })
});

export default FeatureController;
