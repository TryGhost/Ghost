import loadingIndicator from 'ghost/mixins/loading-indicator';

var SettingsGeneralRoute = Ember.Route.extend(Ember.SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {
    model: function () {
        return this.store.find('setting', { type: 'blog,theme' }).then(function (records) {
            return records.get('firstObject');
        });
    }
});

export default SettingsGeneralRoute;
