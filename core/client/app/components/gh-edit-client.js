import Ember from 'ember';

const {
  computed
} = Ember;

export default Ember.Component.extend({

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
       redirection_uri: this.get('redirection_uri'),
       description: this.get('description'),
       created_at: moment()
     }
     this.sendAction('saveClient', client);
   }
 }
});
