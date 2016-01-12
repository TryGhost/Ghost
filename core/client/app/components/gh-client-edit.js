import Ember from 'ember';

const {
  computed,
  isEmpty,
  getProperties,
  get
} = Ember;

export default Ember.Component.extend({

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
   }
 }
});
