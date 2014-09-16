import loadingIndicator from 'ghost/mixins/loading-indicator';

var SettingsRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, loadingIndicator, {});

export default SettingsRoute;