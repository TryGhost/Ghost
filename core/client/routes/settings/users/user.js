var SettingsUserRoute = Ember.Route.extend({
    model: function (params) {
        // TODO: Make custom user adapter that uses /api/users/:slug endpoint
        // return this.store.find('user', { slug: params.slug });

        // Instead, get all the users and then find by slug
        return this.store.find('user').then(function (result) {
            return result.findBy('slug', params.slug);
        });
    },

    deactivate: function () {
        var model = this.modelFor('settings.users.user');

        // we want to revert any unsaved changes on exit
        if (model && model.get('isDirty')) {
            model.rollback();
        }

        this._super();
    }
});

export default SettingsUserRoute;
