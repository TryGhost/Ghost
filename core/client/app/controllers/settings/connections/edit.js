import Ember from 'ember';

const {Controller, computed, inject} = Ember;

export default Controller.extend({
  // model <- client
  actions: {
      changeClientStatus(status) {
        let client = this.get('model');
        client.set('status', status);
        client.save();
      },

      refreshSecret() {
        let client = this.get('model');
        client.set('secret', '');
        client.save();
      },

      saveClient(name, description, redirection_uri) {
        let client = this.get('model');

        client.set('name', name);
        client.set('description', description);
        client.set('redirection_uri', redirection_uri);
        client.save();
        this.transitionToRoute('settings.connections.index');
      }
  }
});
