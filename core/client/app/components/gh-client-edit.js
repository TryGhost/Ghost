import Ember from 'ember';

const {
  computed,
  isEmpty,
  getProperties,
  get
} = Ember;

export default Ember.Component.extend({
  init() {
  this.setProperties({
    name: '',
    type: '',
    secret: '',
    logo: '',
    status: '',
    description: ''
  });
  this._super(...arguments);
},
didReceiveAttrs() {
  this.copyClient();
},
copyClient() {
  const client = this.get('client');
  if (client) {
    const values = getProperties(client, 'name', 'type', 'secret', 'logo', 'status', 'description');
    this.setProperties(values);
  }
},
isEnabled: computed('status', {
  get() {
    let status = this.get('status');
    if (status == 'enabled'){
      return true;
    }else{
      return false;
    }
  }
}),

 actions: {
   changeClientStatus(client){
     this.sendAction('changeClientStatus', client);
   },

   refreshToken(client){
     this.sendAction('refreshToken', client);
   }
 }
});
