import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var SettingsRoute = Ember.Route.extend(SimpleAuth.AuthenticatedRouteMixin, styleBody, loadingIndicator, {
    classNames: ['settings']
});

export default SettingsRoute;