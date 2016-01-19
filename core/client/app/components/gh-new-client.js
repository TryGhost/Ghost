import Ember from 'ember';

const {
  computed,
  get
} = Ember;

export default Ember.Component.extend({

 actions: {
   saveClient(){
     let client = {
       name: this.get('name'),
       logo: this.get('logo'),
       redirection_uri: this.get('redirection_uri'),
       description: this.get('description'),
       created_at: moment()
     }
     this.sendAction('saveClient', client);
   }
 }
});
