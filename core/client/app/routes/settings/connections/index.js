import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';

const {inject} = Ember;

export default AuthenticatedRoute.extend({
  model() {
    return this.store.findAll('client');
  }
});
