import Ember from 'ember';

const {
    Component,
    computed,
    inject: {service}
} = Ember;

export default Component.extend({
    tagName: '',

    user: null,

    ghostPaths: service(),

    userDefault: computed('ghostPaths', function () {
        return `${this.get('ghostPaths.subdir')}/ghost/img/user-image.png`;
    }),

    userImageBackground: computed('user.image', 'userDefault', function () {
        let url = this.get('user.image') || this.get('userDefault');

        return Ember.String.htmlSafe(`background-image: url(${url})`);
    }),

    lastLogin: computed('user.lastLogin', function () {
        let lastLogin = this.get('user.lastLogin');

        return lastLogin ? lastLogin.fromNow() : '(Never)';
    })
});
