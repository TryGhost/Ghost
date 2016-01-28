import Ember from 'ember';

const {Controller} = Ember;

export default Controller.extend({
    isEditing: false,

    actions: {
        saveClient(newClient) {
            let client = this.store.createRecord('client', newClient);
            return client.save().finally(()=>{
                this.transitionToRoute('settings.connections.index');
            });
        }
    }
});
