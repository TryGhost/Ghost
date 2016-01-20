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
   setProperty(property, value) {
      console.log(property);
      console.log(value);
      this.setProperty(property, value);
   },

   changeClientStatus(newStatus){
     this.sendAction('changeClientStatus', newStatus);
   },

   refreshSecret(){
     this.sendAction('refreshSecret');
   },

   saveClient(name, description, redirection_uri){
     this.sendAction('saveClient', name, description, redirection_uri);
   }
 }
});
