import Ember from 'ember';

const {Controller} = Ember;

export default Controller.extend({
    isEditing: false,
    trustedDomains: [],

    actions: {
        addUrl(url){
            let trustedDomains = this.get('trustedDomains');
            if (!trustedDomains.contains(url) && url != undefined && url != '') {
                trustedDomains.pushObject(url);
            }
        },

        deleteUrl(url){
            let trustedDomains = this.get('trustedDomains');
            if (trustedDomains.contains(url)) {
                trustedDomains.removeObject(url);
            }
        },

        saveClient(newClient) {
            let client = this.store.createRecord('client', newClient);
            client.set('trusted_domains', this.get('trustedDomains'));
            return client.save().finally(()=>{
                this.transitionToRoute('settings.connections.index');
            });
        }
    }
});
