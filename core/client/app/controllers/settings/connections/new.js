import Ember from 'ember';

const {Controller, computed, inject} = Ember;

export default Controller.extend({

actions: {
    saveClient(newClient) {
    let client = this.store.createRecord('client', newClient);
    client.save();
    this.transitionToRoute('settings.connections.index');
    }
  }
});
