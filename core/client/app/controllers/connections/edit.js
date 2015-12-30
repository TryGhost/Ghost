import Ember from 'ember';

const {Controller, computed, inject} = Ember;

export default Controller.extend({

  actions: {
      changeClientStatus(client) {
        console.log(client.status);
      },

      refreshClientToken(token) {
        console.log('Token refreshed.')
      }
  }
});
