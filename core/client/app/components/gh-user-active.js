import Ember from 'ember';

const {Component, computed, inject} = Ember;

export default Component.extend({
    tagName: '',

    user: null,

    ghostPaths: inject.service('ghost-paths'),

    userDefault: computed('ghostPaths', function () {
        return this.get('ghostPaths.url').asset('/shared/img/user-image.png');
    }),

    userImageBackground: computed('user.image', 'userDefault', function () {
        let url = this.get('user.image') || this.get('userDefault');

        return Ember.String.htmlSafe(`background-image: url(${url})`);
    }),

    lastLogin: computed('user.last_login', function () {
        let lastLogin = this.get('user.last_login');

        return lastLogin ? lastLogin.fromNow() : '(Never)';
    })
});
