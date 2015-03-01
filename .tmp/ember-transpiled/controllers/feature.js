define("ghost/controllers/feature", 
  ["exports"],
  function(__exports__) {
    "use strict";
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

        codeInjectionUI: Ember.computed('config.codeInjectionUI', 'labs.codeInjectionUI', function () {
            return this.get('config.codeInjectionUI') || this.get('labs.codeInjectionUI');
        })
    });

    __exports__["default"] = FeatureController;
  });