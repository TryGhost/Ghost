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

export default NProgressSaveMixin;