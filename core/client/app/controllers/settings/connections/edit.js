import Ember from 'ember';

const {Controller, computed, inject} = Ember;

export default Controller.extend({

isEditing: true,

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

  saveClient(clientData) {
    let client = this.get('model');
    client.setProperties(clientData);
    return client.save().finally(()=>{
        this.transitionToRoute('settings.connections.index');
    });
  }
}
});
