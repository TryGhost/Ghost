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
            const changeClientStatus = this.get('changeClientStatus');
            return changeClientStatus(newStatus).catch(err => {
                this.set('formError', err);
            });
        },

        refreshSecret(){
            const refreshSecret = this.get('refreshSecret');
            return refreshSecret().catch(err => {
                this.set('formError', err);
            });
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
