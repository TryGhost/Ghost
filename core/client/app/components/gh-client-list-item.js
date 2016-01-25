import Ember from 'ember';

const {Component, computed} = Ember;

export default Ember.Component.extend({

    isSpecialClient: Ember.computed('name', function () {
        let name = this.get('name');

        return name.startsWith('Ghost');
    }),

  actions: {
    deleteClient(id){
      this.sendAction('deleteClient', id);
    }
  }
});
