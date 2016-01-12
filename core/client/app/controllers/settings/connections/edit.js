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
      }
  }
});
