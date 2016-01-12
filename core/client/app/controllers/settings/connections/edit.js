import Ember from 'ember';

const {Controller, computed, inject} = Ember;

export default Controller.extend({

  actions: {
      changeClientStatus(clientObject) {
        let client = this.get(clientObject[0]);
        console.log(this.get('client'));
        //this.set('client.status', 'disabled');
      },

      refreshToken(clientObject) {
        console.log(client);
      }
  }
});
