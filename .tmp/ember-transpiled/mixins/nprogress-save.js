define("ghost/mixins/nprogress-save", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var NProgressSaveMixin = Ember.Mixin.create({
        save: function (options) {
            if (options && options.disableNProgress) {
                return this._super(options);
            }

            NProgress.start();

            return this._super(options).then(function (value) {
                NProgress.done();

                return value;
            }).catch(function (error) {
                NProgress.done();

                return Ember.RSVP.reject(error);
            });
        }
    });

    __exports__["default"] = NProgressSaveMixin;
  });