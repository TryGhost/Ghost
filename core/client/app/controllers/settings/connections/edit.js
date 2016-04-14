import Ember from 'ember';

const {Controller} = Ember;

export default Controller.extend({

isEditing: true,
trustedDomains: [],

actions: {
    addUrl(url){
        let trustedDomains = this.get('model.trusted_domains');
        if (!trustedDomains.contains(url) && url != undefined && url != '') {
            trustedDomains.pushObject(url);
        }
    },

    deleteUrl(url){
        let trustedDomains = this.get('model.trusted_domains');
        if (trustedDomains.contains(url)) {
            trustedDomains.removeObject(url);
        }
    },

  changeClientStatus(status) {
    let client = this.get('model');
    client.set('status', status);
    return client.save();
  },

  refreshSecret() {
    let client = this.get('model');
    client.set('secret', '');
    return client.save();
  },

  saveClient(clientData) {
    let client = this.get('model');
    client.set('trusted_domains', this.get('model.trusted_domains'));
    client.setProperties(clientData);
    return client.save().finally(()=>{
        this.transitionToRoute('settings.connections.index');
    });
  }
}
});
