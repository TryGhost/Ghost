import Ember from 'ember';

const {Controller, computed, inject} = Ember;

export default Controller.extend({
    isEditing: false,

    actions: {
        saveClient(newClient) {
            let client = this.store.createRecord('client', newClient);
            client.validate().then(() => {

              this.transitionToRoute('settings.connections.index');

            }, () => {
              alert('validation failed');
            });
        }
    }
});
