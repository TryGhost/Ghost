import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';

const {inject} = Ember;

export default AuthenticatedRoute.extend({
  beforeModel() {
      this._super(...arguments);
  },

  model() {
    this.store.unloadAll('client');

    return this.store.findAll('client');
  }
});
