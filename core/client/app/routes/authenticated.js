import Ember from 'ember';
import AuthenticatedRouteMixin from 'simple-auth/mixins/authenticated-route-mixin';

var AuthenticatedRoute = Ember.Route.extend(AuthenticatedRouteMixin);

export default AuthenticatedRoute;
