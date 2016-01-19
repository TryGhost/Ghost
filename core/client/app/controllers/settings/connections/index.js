import Ember from 'ember';

const {Controller, computed, inject} = Ember;

export default Controller.extend({

actions: {
    deleteClient(id) {
      this.store.findRecord('client', id).then(function(client) {
        client.destroyRecord();
      });
    }
  }
});
