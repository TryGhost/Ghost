import Ember from 'ember';

export default Ember.Component.extend({
    tagName: '',

    user: null,

    ghostPaths: Ember.inject.service('ghost-paths'),

    userDefault: Ember.computed('ghostPaths', function () {
        return this.get('ghostPaths.url').asset('/shared/img/user-image.png');
    }),

    userImageBackground: Ember.computed('user.image', 'userDefault', function () {
        var url = this.get('user.image') || this.get('userDefault');

        return `background-image: url(${url})`.htmlSafe();
    }),

    lastLogin: Ember.computed('user.last_login', function () {
        var lastLogin = this.get('user.last_login');

        return lastLogin ? lastLogin.fromNow() : '(Never)';
    })
});
