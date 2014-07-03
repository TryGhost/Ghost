var SettingsUserRoute = Ember.Route.extend({
    model: function () {
        return this.session.get('user').then(function (user) {
            user.reload();
            return user;
        });
    },

    deactivate: function () {
        this._super();

        // we want to revert any unsaved changes on exit
        this.session.get('user').then(function (user) {
            if (user.get('isDirty')) {
                user.rollback();
            }
        });
    }
});

export default SettingsUserRoute;
