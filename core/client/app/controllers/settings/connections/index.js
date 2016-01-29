import Ember from 'ember';

const {Controller, computed, inject} = Ember;

export default Controller.extend({

actions: {
    deleteClient(id) {
      return this.store.findRecord('client', id).then((client) => {
          client.destroyRecord();
      });
    }
  }
});
