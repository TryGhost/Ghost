import AuthenticatedRouteMixin from 'ember-simple-auth/mixins/authenticated-route-mixin';
import Route from 'ember-route';

export default Route.extend(AuthenticatedRouteMixin, {
    authenticationRoute: 'signin'
});
