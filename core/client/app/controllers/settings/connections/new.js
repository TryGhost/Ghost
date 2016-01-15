import Ember from 'ember';

const {Controller, computed, inject} = Ember;

export default Controller.extend({

actions: {
    saveClient() {
      let clientData = {
        name: this.get('name'),
        logo: this.get('logo'),
        redirection_uri: this.get('redirection_uri'),
        description: this.get('description'),
        created_at: moment()
      };
    let client = this.store.createRecord('client', clientData);
    client.save();
    this.transitionToRoute('settings.connections.index');
    }
  }
});
