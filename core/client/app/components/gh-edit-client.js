import Ember from 'ember';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {
    computed
} = Ember;

export default Ember.Component.extend(ValidationEngine, {
    validationType: 'client',

    isEnabled: computed('status', {
        get() {
            return this.get('status') === 'enabled';
        }
    }),

    actions: {
        changeClientStatus(newStatus){
            this.sendAction('changeClientStatus', newStatus);
        },

        refreshSecret(){
            this.sendAction('refreshSecret');
        },

        saveClient(){
            let client = this.getProperties(['name', 'description', 'redirection_uri']);
            this.validate()
                .then(() => {
                    const saveClient = this.get('saveClient');
                    return saveClient(client);
                })
                .catch(err => {
                    this.set('formError', err);
                });
        }
    }
});
