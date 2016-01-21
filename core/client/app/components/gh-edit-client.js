import Ember from 'ember';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {
  computed
} = Ember;

export default Ember.Component.extend(ValidationEngine, {
    validationType: 'client',

  didReceiveAttrs(attrs) {
      this._super(...arguments);
  },

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
     let client = {
       name: this.get('name'),
       logo: this.get('logo'),
       redirection_uri: this.get('redirection_uri'),
       description: this.get('description'),
       created_at: moment()
     }
     this.validate().then(() => {
        this.sendAction('saveClient', client);
     });
    }
 }
});
