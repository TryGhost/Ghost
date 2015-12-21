import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';

const {inject} = Ember;

export default AuthenticatedRoute.extend({
  model() {
    this.store.unloadAll('client');
    return this.store.findAll('client');
  },

  actions: {
    edit(client) {
      console.log(client);
      this.transitionTo('settings.connections.edit', client);
    }
  }
});
