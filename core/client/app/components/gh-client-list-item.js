import Ember from 'ember';

const {Component, computed, inject} = Ember;

export default Ember.Component.extend({
  actions: {
    deleteClient(id){
      this.sendAction('deleteClient', id);
    }
  }
});
