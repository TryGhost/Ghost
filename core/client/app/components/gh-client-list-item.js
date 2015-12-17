import Ember from 'ember';

const {Component, computed, inject} = Ember;

export default Ember.Component.extend({
  tagName: '',

  client: null,

  clientName: computed('client.name', function () {
      let name = this.get('client.name');

      return name;
  }),

  clientLogo: computed('client.logo', function () {
      let url = this.get('client.logo');

      return Ember.String.htmlSafe(`client-logo: url(${url})`);
  }),

  lastUsed: computed('client.updated_at', function () {
      let lastUsed = this.get('client.updated_at');

      return lastUsed;
  })
});
