import Ember from 'ember';

const {Component,
     computed,
      inject: {service}
        } = Ember;

export default Ember.Component.extend({
    ghostPaths: service(),

    userDefault: computed('ghostPaths', function () {
        return `${this.get('ghostPaths.subdir')}/ghost/img/user-image.png`;
    }),

    clientImageBackground: computed('logo', 'userDefault', function () {
        let url = this.get('logo') || this.get('userDefault');

        return Ember.String.htmlSafe(`background-image: url(${url})`);
    }),

    isSpecialClient: Ember.computed('name', function () {
        let slug = this.get('slug');

        return slug.startsWith('ghost-');
    }),

  actions: {
    deleteClient(id){
      const deleteClient = this.get('deleteClient');
      return deleteClient(id).catch(err => {
          this.set('formError', err);
      });
    }
  }
});
